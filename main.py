#!/usr/bin/env python3
import sys, math, heapq, random
from collections import defaultdict, deque
import time

#input
if len(sys.argv) > 1:               
    f = open(sys.argv[1], "r", buffering=1)
else:                              
    f = sys.stdin

def read_ints():
    return list(map(int, f.readline().split()))


DIR4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]

def perimeter_delta(neigh_cnt, s):
    return (4, 2, 0, -2)[neigh_cnt] * s if 0 <= neigh_cnt <= 3 else 0

import random, math, time



def has_hole(added, split):
    """Flood-fill on a (split+2)×(split+2) board: True → hole detected."""
    visited = [[False]*(split+2) for _ in range(split+2)]
    for i in range(split+2):
        visited[0][i] = visited[split+1][i] = True
        visited[i][0] = visited[i][split+1] = True

    q = deque([(1, 1)])
    visited[1][1] = True
    while q:
        x, y = q.popleft()
        for dx, dy in DIR4:
            nx, ny = x+dx, y+dy
            if not (0 <= nx < split+2 and 0 <= ny < split+2):      continue
            if visited[nx][ny]:                                    continue
            if 1 <= nx-1 < split and 1 <= ny-1 < split and (nx-1, ny-1) in added:
                continue
            visited[nx][ny] = True
            q.append((nx, ny))

    for i in range(1, split+1):
        for j in range(1, split+1):
            if (i-1, j-1) not in added and not visited[i][j]:
                return True
    return False

def sa_refine(added, cell_size, cell_data, K,split, time_limit=0.3):
   
    start_time = time.time()
    T0, T_end = 5.0, 0.05           # initial and final “temperatures”
    max_iter = 5000                 # quick - tweak freely
    beta = math.log(T0/T_end) / max_iter

    def cost(s):
        per = 0
        for (cx, cy) in s:
            # perimeter contribution: each exposed edge = +cell_size
            ne = 4 - sum(((cx+dx, cy+dy) in s) for dx,dy in DIR4)
            per += ne * cell_size
        w   = sum(cell_data[c]["w"] for c in s)
        return per + w

    cur = set(added)
    cur_cost = cost(cur)
    best = set(cur); best_cost = cur_cost

    for it in range(max_iter):
        if time.time() - start_time > time_limit: break
        T = T0 * math.exp(-beta * it)

        border = [c for c in cur if any(((c[0]+dx, c[1]+dy) not in cur) for dx,dy in DIR4)]
        chosen = random.choice(border)
        dx,dy = random.choice(DIR4)
        flip  = (chosen[0]+dx, chosen[1]+dy)

        # if outside the bounding square of interest, skip
        if flip not in cell_data: continue

        proposal = set(cur)
        if flip in proposal:
            proposal.remove(flip)
        else:
            proposal.add(flip)

        # keep feasible solutions only (simple + ≥K buildings)
        if has_hole(proposal, split):        # rough split estimate
            continue
        if sum(cell_data[c]["cnt"] for c in proposal) < K:
            continue

        prop_cost = cost(proposal)
        dE = prop_cost - cur_cost
        if dE < 0 or random.random() < math.exp(-dE / T):
            cur, cur_cost = proposal, prop_cost
            if cur_cost < best_cost:
                best, best_cost = set(cur), cur_cost

    return best, best_cost


def extract_boundary(added, s):
    edge_cnt = defaultdict(int)
    for cx, cy in added:
        x0, y0 = cx*s, cy*s
        x1, y1 = x0+s, y0+s
        edges = [((x0,y0),(x1,y0)),((x1,y0),(x1,y1)),
                 ((x1,y1),(x0,y1)),((x0,y1),(x0,y0))]
        for a,b in edges:
            if a>b: a,b=b,a
            edge_cnt[(a,b)] += 1
    bdry = {e for e,c in edge_cnt.items() if c==1}
    adj = defaultdict(list)
    for a,b in bdry:
        adj[a].append(b)
        adj[b].append(a)

    start = min(adj)
    poly, prev, cur = [start], None, start
    while True:
        nxts = adj[cur]
        if prev is None:
            nxt = min(nxts)
        else:
            vx, vy = cur[0]-prev[0], cur[1]-prev[1]
            best = None
            for cand in nxts:
                if cand==prev: continue
                wx, wy = cand[0]-cur[0], cand[1]-cur[1]
                quad = 0 if (wy>0 or (wy==0 and wx>0)) else 1
                cross = vx*wy - vy*wx
                dot   = vx*wx + vy*wy
                key   = (quad, -cross, dot)
                if best is None or key<best[1]:
                    best = (cand, key)
            nxt = best[0]
        if nxt==start: break
        poly.append(nxt); prev,cur=cur,nxt
    poly.append(start)

    out=[]
    for i in range(len(poly)-1):
        x1,y1=poly[i]; x2,y2=poly[i+1]
        out.append((x1,y1,x2,y2))
    return out

# Greedy on one (split, cell_size) 
def greedy(buildings, K, split, cell_size):
    cells = defaultdict(lambda: {"w":0.0,"cnt":0})
    for x,y,w in buildings:
        cx=min(split-1,int(x//cell_size))
        cy=min(split-1,int(y//cell_size))
        d=cells[(cx,cy)]
        d["w"]+=w; d["cnt"]+=1

    best_start=min(cells.items(), key=lambda kv:4*cell_size+kv[1]["w"])[0]
    added={best_start}
    tot_w=cells[best_start]["w"]; tot_cnt=cells[best_start]["cnt"]
    perim=4*cell_size

    heap=[]; seen=set()
    def push(ncx,ncy):
        if (ncx,ncy) in seen or (ncx,ncy) in added: return
        seen.add((ncx,ncy))
        if (ncx,ncy) not in cells: return
        neigh=sum(((ncx+dx,ncy+dy) in added) for dx,dy in DIR4)
        dper=perimeter_delta(neigh,cell_size)
        heapq.heappush(heap,(dper+cells[(ncx,ncy)]["w"],ncx,ncy))

    cx0,cy0=best_start
    for dx,dy in DIR4: push(cx0+dx,cy0+dy)

    best_cost=perim+tot_w if tot_cnt>=K else float('inf')
    best_added=set(added); best_cnt=tot_cnt

    while heap:
        dcost,cx,cy=heapq.heappop(heap)
        if dcost>0 and tot_cnt>=K and perim+tot_w+dcost>=best_cost: break
        added.add((cx,cy))
        neigh=sum(((cx+dx,cy+dy) in added) for dx,dy in DIR4)-1
        perim+=perimeter_delta(neigh,cell_size)
        tot_w+=cells[(cx,cy)]["w"]; tot_cnt+=cells[(cx,cy)]["cnt"]
        if has_hole(added,split):
            added.remove((cx,cy)); tot_w-=cells[(cx,cy)]["w"]; tot_cnt-=cells[(cx,cy)]["cnt"]
            perim-=perimeter_delta(neigh,cell_size); continue
        for dx,dy in DIR4: push(cx+dx,cy+dy)
        cur_cost=perim+tot_w
        if tot_cnt>=K and cur_cost<best_cost:
            best_cost, best_added, best_cnt = cur_cost, set(added), tot_cnt

    if best_cost==float('inf'): return None
    return best_cost, best_added, cell_size, best_cnt, cells



def solve():
    N,K=read_ints()
    buildings=[tuple(read_ints()) for _ in range(N)]
    max_coord=max(max(x,y) for x,y,_ in buildings)+1

    SA_TIME = 0.30
    best=None
    for split in range(1,111):                    
        # dynamic trial count 
        if   1<split<10:  trials=80
        elif 1<split<20:  trials=20
        else:             trials=1
        base_size=max_coord/split
        for _ in range(trials):                  
            if split>4:
                factor=1 - 0.01/split*random.random()
            else:
                factor=1 - 0.0005*random.random()
            cell_size=base_size*factor            
            res=greedy(buildings,K,split,cell_size)
            if res is None: continue
            g_cost, g_added, s, g_inside, cells = res
            sa_added, sa_cost = sa_refine(
                g_added, s, cells, K, split, time_limit=SA_TIME)
            sa_inside = sum(cells[c]["cnt"] for c in sa_added)
            if best is None or sa_cost < best[0]:
                best = (sa_cost, sa_added, s, sa_inside)
            elif g_cost < best[0]:
                best = (g_cost, g_added, s, g_inside)

    if best is None:                              
        print("0.0\n0"); return

    cost,added,cell_sz,inside_cnt=best
    edges=extract_boundary(added,cell_sz)

    sys.stdout.write(f"{cost:.6f}\n{inside_cnt}\n{len(edges)}\n")
    for x1,y1,x2,y2 in edges:
        sys.stdout.write(f"{x1:.6f} {y1:.6f} {x2:.6f} {y2:.6f}\n")
    with open("output.txt","w") as g:            
        g.write(f"{cost:.6f}\n{inside_cnt}\n{len(edges)}\n")
        for x1,y1,x2,y2 in edges:
            g.write(f"{x1:.6f} {y1:.6f} {x2:.6f} {y2:.6f}\n")

if __name__=="__main__":
    t0 = time.perf_counter()
    solve()
    t1 = time.perf_counter()
    print(f"Execution time: {((t1 - t0)/60):.2f} minutes", file=sys.stderr)
