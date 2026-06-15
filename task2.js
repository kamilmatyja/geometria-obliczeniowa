// ====== STRUKTURY DANYCH ======

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.name = "";
    }
    equals(other) {
        return Math.abs(this.x - other.x) < 1e-9 && Math.abs(this.y - other.y) < 1e-9;
    }
}

class Segment {
    constructor(p, q, name) {
        // Zapewniamy, że punkt p jest zawsze na lewo od q
        if (p.x < q.x || (Math.abs(p.x - q.x) < 1e-9 && p.y < q.y)) {
            this.p = p; this.q = q;
        } else {
            this.p = q; this.q = p;
        }
        this.name = name;
    }
    evaluate(x) {
        if (Math.abs(this.p.x - this.q.x) < 1e-9) return this.p.y;
        return this.p.y + (this.q.y - this.p.y) * (x - this.p.x) / (this.q.x - this.p.x);
    }
}

class Trapezoid {
    constructor(top, bot, leftp, rightp) {
        this.top = top;
        this.bot = bot;
        this.leftp = leftp;
        this.rightp = rightp;
        this.name = "";
        this.leaf = null;
    }
}

class DAGNode {
    constructor(type, val) {
        this.type = type; // 'X', 'Y', lub 'LEAF'
        this.val = val;   // Point, Segment lub Trapezoid
        this.left = null;
        this.right = null;
        this.parents = [];
        this.id = 'node_' + Math.random().toString(36).substr(2, 9);
    }

    setLeft(child) {
        this.left = child;
        if (child) child.parents.push(this);
    }

    setRight(child) {
        this.right = child;
        if (child) child.parents.push(this);
    }

    replaceWith(newNode) {
        for (let p of this.parents) {
            if (p.left === this) p.left = newNode;
            if (p.right === this) p.right = newNode;
            newNode.parents.push(p);
        }

        if (window.globalRoot === this) {
            window.globalRoot = newNode;
        }
        this.parents = [];
    }
}

// ====== LOGIKA MATEMATYCZNA ======

function ccw(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function searchDAG(node, pt, s_new, force_right_on_x) {
    if (node.type === 'LEAF') return node.val;

    if (node.type === 'X') {
        if (Math.abs(pt.x - node.val.x) < 1e-9) {
            return force_right_on_x ? searchDAG(node.right, pt, s_new, force_right_on_x) : searchDAG(node.left, pt, s_new, force_right_on_x);
        }
        return (pt.x < node.val.x) ? searchDAG(node.left, pt, s_new, force_right_on_x) : searchDAG(node.right, pt, s_new, force_right_on_x);
    }

    if (node.type === 'Y') {
        let s_dag = node.val;
        let orient = ccw(s_dag.p, s_dag.q, pt);

        if (orient > 1e-9) return searchDAG(node.left, pt, s_new, force_right_on_x);
        if (orient < -1e-9) return searchDAG(node.right, pt, s_new, force_right_on_x);

        let dx1 = s_new.q.x - s_new.p.x;
        let dy1 = s_new.q.y - s_new.p.y;
        let dx2 = s_dag.q.x - s_dag.p.x;
        let dy2 = s_dag.q.y - s_dag.p.y;

        let slope_diff = dy1 * dx2 - dy2 * dx1;
        if (slope_diff > 0) return searchDAG(node.left, pt, s_new, force_right_on_x);
        else return searchDAG(node.right, pt, s_new, force_right_on_x);
    }
}

function findIntersectingTrapezoids(s_new) {
    let traps = [];
    let current = searchDAG(window.globalRoot, s_new.p, s_new, true);
    traps.push(current);

    while (current.rightp.x < s_new.q.x - 1e-9) {
        let x_exit = current.rightp.x;
        let y_exit = s_new.evaluate(x_exit);
        let p_exit = new Point(x_exit, y_exit);

        current = searchDAG(window.globalRoot, p_exit, s_new, true);
        traps.push(current);
    }
    return traps;
}

// ====== GŁÓWNY ALGORYTM WSTAWIANIA ======

function insertSegment(s) {
    let traps = findIntersectingTrapezoids(s);
    let p = s.p;
    let q = s.q;

    let current_top = null;
    let current_bot = null;

    for (let i = 0; i < traps.length; i++) {
        let t = traps[i];
        let is_first = (i === 0);
        let is_last = (i === traps.length - 1);

        let t_left = null;
        let t_right = null;

        if (is_first && p.x > t.leftp.x + 1e-9) {
            t_left = new Trapezoid(t.top, t.bot, t.leftp, p);
            window.allTrapezoids.add(t_left);
        }
        if (is_last && q.x < t.rightp.x - 1e-9) {
            t_right = new Trapezoid(t.top, t.bot, q, t.rightp);
            window.allTrapezoids.add(t_right);
        }

        let t_top = null;
        if (current_top && current_top.top.name === t.top.name) {
            current_top.rightp = (is_last && q.x < t.rightp.x - 1e-9) ? q : t.rightp;
            t_top = current_top;
        } else {
            let left_pt = (is_first && p.x > t.leftp.x + 1e-9) ? p : t.leftp;
            let right_pt = (is_last && q.x < t.rightp.x - 1e-9) ? q : t.rightp;
            t_top = new Trapezoid(t.top, s, left_pt, right_pt);
            window.allTrapezoids.add(t_top);
            current_top = t_top;
        }

        let t_bot = null;
        if (current_bot && current_bot.bot.name === t.bot.name) {
            current_bot.rightp = (is_last && q.x < t.rightp.x - 1e-9) ? q : t.rightp;
            t_bot = current_bot;
        } else {
            let left_pt = (is_first && p.x > t.leftp.x + 1e-9) ? p : t.leftp;
            let right_pt = (is_last && q.x < t.rightp.x - 1e-9) ? q : t.rightp;
            t_bot = new Trapezoid(s, t.bot, left_pt, right_pt);
            window.allTrapezoids.add(t_bot);
            current_bot = t_bot;
        }

        if (!t_top.leaf) t_top.leaf = new DAGNode('LEAF', t_top);
        if (!t_bot.leaf) t_bot.leaf = new DAGNode('LEAF', t_bot);
        if (t_left && !t_left.leaf) t_left.leaf = new DAGNode('LEAF', t_left);
        if (t_right && !t_right.leaf) t_right.leaf = new DAGNode('LEAF', t_right);

        let yNode = new DAGNode('Y', s);
        yNode.setLeft(t_top.leaf);
        yNode.setRight(t_bot.leaf);

        let new_root = yNode;

        if (is_first && is_last) {
            if (t_left && t_right) {
                let xRight = new DAGNode('X', q);
                xRight.setLeft(yNode);
                xRight.setRight(t_right.leaf);

                let xLeft = new DAGNode('X', p);
                xLeft.setLeft(t_left.leaf);
                xLeft.setRight(xRight);
                new_root = xLeft;
            } else if (t_left) {
                let xLeft = new DAGNode('X', p);
                xLeft.setLeft(t_left.leaf);
                xLeft.setRight(yNode);
                new_root = xLeft;
            } else if (t_right) {
                let xRight = new DAGNode('X', q);
                xRight.setLeft(yNode);
                xRight.setRight(t_right.leaf);
                new_root = xRight;
            }
        } else if (is_first) {
            if (t_left) {
                let xLeft = new DAGNode('X', p);
                xLeft.setLeft(t_left.leaf);
                xLeft.setRight(yNode);
                new_root = xLeft;
            }
        } else if (is_last) {
            if (t_right) {
                let xRight = new DAGNode('X', q);
                xRight.setLeft(yNode);
                xRight.setRight(t_right.leaf);
                new_root = xRight;
            }
        }

        window.allTrapezoids.delete(t);
        t.leaf.replaceWith(new_root);
    }
}

// ====== FUNKCJE PARSUJĄCE ======

function processTrapezoidalMap() {
    window.allTrapezoids = new Set();
    window.globalRoot = null;

    let text = document.getElementById('segmentsInput').value;
    let orderText = document.getElementById('insertionOrder').value;
    let mathLog = [];

    let segmentMap = new Map();
    let uniquePoints = [];
    let allPoints = [];

    let regex = /([a-zA-Z0-9]+)\s*=\s*\{\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)\s*,\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)\s*\}/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        let name = match[1].toLowerCase();
        let p1 = new Point(parseFloat(match[2]), parseFloat(match[3]));
        let p2 = new Point(parseFloat(match[4]), parseFloat(match[5]));

        let s = new Segment(p1, p2, name);
        segmentMap.set(s.name, s);
        allPoints.push(p1, p2);
    }

    // Przypisanie nazw punktom z zachowaniem kolejności wejścia (odwzorowuje P1, P2 z PDF)
    for (let p of allPoints) {
        let found = uniquePoints.find(up => up.equals(p));
        if (!found) {
            p.name = 'p' + (uniquePoints.length + 1);
            uniquePoints.push(p);
        }
    }

    window.uniquePoints = uniquePoints;

    for (let s of segmentMap.values()) {
        s.p = uniquePoints.find(up => up.equals(s.p));
        s.q = uniquePoints.find(up => up.equals(s.q));
    }

    let orderKeys = orderText.split(',').map(s => s.trim().toLowerCase());
    orderKeys = orderKeys.map(k => isNaN(k) ? k : 's' + k);

    let segmentsToInsert = [];
    for (let k of orderKeys) {
        if (segmentMap.has(k)) segmentsToInsert.push(segmentMap.get(k));
    }
    window.segmentsToInsert = segmentsToInsert;

    mathLog.push('ROZPOCZĘCIE BUDOWY MAPY TRAPEZOWEJ I DAG\n');
    mathLog.push('Definicje matematyczne:');
    mathLog.push('1) Orientacja: ccw(a,b,c) = (b.x-a.x)(c.y-a.y) - (b.y-a.y)(c.x-a.x).');
    mathLog.push('2) Równanie odcinka: y(x) = y1 + (y2-y1) * (x-x1)/(x2-x1).');
    mathLog.push('3) Węzły DAG: X -> test po współrzędnej x punktu, Y -> test po stronie odcinka, LEAF -> trapez.\n');
    mathLog.push(`Wejściowa kolejność wstawiania: { ${segmentsToInsert.map(s => s.name).join(', ')} }\n`);

    let minX = Math.min(...uniquePoints.map(p => p.x)) - 1;
    let maxX = Math.max(...uniquePoints.map(p => p.x)) + 1;
    let minY = Math.min(...uniquePoints.map(p => p.y)) - 1;
    let maxY = Math.max(...uniquePoints.map(p => p.y)) + 1;

    let pTL = new Point(minX, maxY); pTL.name="TL";
    let pTR = new Point(maxX, maxY); pTR.name="TR";
    let pBL = new Point(minX, minY); pBL.name="BL";
    let pBR = new Point(maxX, minY); pBR.name="BR";

    let sTop = new Segment(pTL, pTR, "BB_TOP");
    let sBot = new Segment(pBL, pBR, "BB_BOT");

    let initialTrap = new Trapezoid(sTop, sBot, pBL, pBR);
    initialTrap.leaf = new DAGNode('LEAF', initialTrap);
    window.globalRoot = initialTrap.leaf;
    window.allTrapezoids.add(initialTrap);

    mathLog.push('Krok 0: Inicjalizacja bounding box i jednego trapezu początkowego T0.\n');

    for(let i = 0; i < segmentsToInsert.length; i++) {
        let s = segmentsToInsert[i];
        let hit = findIntersectingTrapezoids(s);
        mathLog.push(`Krok ${i + 1}: Wstawiamy ${s.name} = (${s.p.x},${s.p.y}) -> (${s.q.x},${s.q.y}).`);
        mathLog.push(`  - Liczba przecinanych trapezów: ${hit.length}.`);
        mathLog.push('  - Dla każdego przecinanego trapezu wykonujemy podział na część górną i dolną (oraz skrajne lewe/prawe fragmenty, jeśli występują).');
        mathLog.push('  - W DAG podstawiamy lokalnie nowe poddrzewo X/Y zamiast starego liścia.\n');
        insertSegment(s);
    }

    let validTraps = Array.from(window.allTrapezoids);
    validTraps.sort((a, b) => {
        let cxA = (a.leftp.x + a.rightp.x) / 2;
        let cxB = (b.leftp.x + b.rightp.x) / 2;
        if (Math.abs(cxA - cxB) > 1e-9) return cxA - cxB;
        let cyA = (a.top.evaluate(cxA) + a.bot.evaluate(cxA)) / 2;
        let cyB = (b.top.evaluate(cxB) + b.bot.evaluate(cxB)) / 2;
        return cyB - cyA;
    });

    let letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    validTraps.forEach((t, i) => { t.name = letters[i] || ("T" + i); });

    mathLog.push(`Wynik: liczba trapezów końcowych = ${validTraps.length}.`);
    mathLog.push('Nazwy trapezów po sortowaniu od lewej (i od góry dla tych samych x): ' + validTraps.map(t => t.name).join(', '));

    let logEl = document.getElementById('trapezoidMathLog');
    if (logEl) logEl.innerText = mathLog.join('\n');

    drawMap(minX, maxX, minY, maxY);
    drawDAG();
}

// ------ WIZUALIZACJE CANVAS ------

function drawMap(minX, maxX, minY, maxY) {
    let canvas = document.getElementById('trapezoidCanvas');
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let margin = (maxX - minX) * 0.1;
    let scaleX = canvas.width / ((maxX - minX) + 2*margin);
    let scaleY = canvas.height / ((maxY - minY) + 2*margin);

    let viewMinX = minX - margin;
    let viewMinY = minY - margin;

    function sX(x) { return (x - viewMinX) * scaleX; }
    function sY(y) { return canvas.height - (y - viewMinY) * scaleY; }

    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 2;
    ctx.strokeRect(sX(minX), sY(maxY), sX(maxX) - sX(minX), sY(minY) - sY(maxY));

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#7f8c8d';
    ctx.font = '16px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1) Najpierw tylko granice trapezow (bez liter)
    for (let t of window.allTrapezoids) {
        let lx = sX(t.leftp.x);
        let rx = sX(t.rightp.x);

        ctx.beginPath();
        ctx.moveTo(lx, sY(t.top.evaluate(t.leftp.x))); ctx.lineTo(lx, sY(t.bot.evaluate(t.leftp.x)));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rx, sY(t.top.evaluate(t.rightp.x))); ctx.lineTo(rx, sY(t.bot.evaluate(t.rightp.x)));
        ctx.stroke();
    }

    // 2) Segmenty i ich etykiety sX - etykieta przesunieta od srodka, zeby rzadziej kolidowala z literami trapezow
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    for (let s of window.segmentsToInsert) {
        ctx.beginPath();
        ctx.moveTo(sX(s.p.x), sY(s.p.y));
        ctx.lineTo(sX(s.q.x), sY(s.q.y));
        ctx.stroke();

        let tx = s.p.x + 0.20 * (s.q.x - s.p.x);
        let ty = s.p.y + 0.20 * (s.q.y - s.p.y);

        ctx.fillStyle = 'rgba(231, 76, 60, 0.65)';
        ctx.font = 'bold 15px Arial';
        ctx.fillText(s.name, sX(tx), sY(ty) - 10);
    }

    // 3) Na koncu litery trapezow A, B, ... na wierzchu dla czytelnosci
    ctx.font = '16px Arial';
    ctx.fillStyle = '#000';
    for (let t of window.allTrapezoids) {
        let cx = (t.leftp.x + t.rightp.x) / 2;
        let cy = (t.top.evaluate(cx) + t.bot.evaluate(cx)) / 2;

        // Delikatny halo poprawia czytelnosc na liniach
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.strokeText(t.name, sX(cx), sY(cy));
        ctx.fillText(t.name, sX(cx), sY(cy));
    }

    ctx.lineWidth = 1;
    for (let p of window.uniquePoints) {
        let sx = sX(p.x);
        let sy = sY(p.y);

        ctx.strokeStyle = '#95a5a6';
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(sx + 5, sy - 15, 20, 15);
        ctx.strokeRect(sx + 5, sy - 15, 20, 15);
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '10px Arial';
        ctx.fillText(p.name, sx + 15, sy - 7);

        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, 2*Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.stroke();
    }
}

// ------ WIZUALIZACJA GRAFU (Renderowanie Drzewa) ------

function drawDAG() {
    let container = document.getElementById('dagFlowchart');
    container.innerHTML = '<svg id="dag-svg"></svg>';

    let layersMap = {};

    // Transformujemy DAG do Drzewa - duplikuje to współdzielone węzły wizualnie!
    function traverseAndCollect(node, depth) {
        if (!node) return null;

        let visualNode = {
            type: node.type,
            val: node.val,
            id: 'vnode_' + Math.random().toString(36).substr(2, 9)
        };

        if (!layersMap[depth]) layersMap[depth] = [];
        layersMap[depth].push(visualNode);

        if (node.left) visualNode.left = traverseAndCollect(node.left, depth + 1);
        if (node.right) visualNode.right = traverseAndCollect(node.right, depth + 1);

        return visualNode;
    }

    // Wygeneruj wizualne drzewo
    let vRoot = traverseAndCollect(window.globalRoot, 0);

    let maxDepth = Math.max(...Object.keys(layersMap).map(Number));
    for (let d = 0; d <= maxDepth; d++) {
        let row = document.createElement('div');
        row.className = 'dag-level';
        for (let vNode of layersMap[d]) {
            let el = document.createElement('div');
            el.className = 'node ' + (vNode.type === 'Y' ? 'segment' : (vNode.type === 'LEAF' ? 'trapezoid' : ''));
            el.id = vNode.id;
            el.innerText = vNode.type === 'LEAF' ? vNode.val.name : vNode.val.name;
            row.appendChild(el);
        }
        container.appendChild(row);
    }

    requestAnimationFrame(() => {
        let svg = document.getElementById('dag-svg');
        let containerRect = container.getBoundingClientRect();

        svg.setAttribute('width', container.scrollWidth);
        svg.setAttribute('height', container.scrollHeight);

        let allVisualNodes = [];
        for (let d in layersMap) {
            allVisualNodes.push(...layersMap[d]);
        }

        for (let n of allVisualNodes) {
            if (n.left) drawSVGLine(n, n.left, svg, container, containerRect);
            if (n.right) drawSVGLine(n, n.right, svg, container, containerRect);
        }
    });
}

function drawSVGLine(n1, n2, svg, container, containerRect) {
    let el1 = document.getElementById(n1.id);
    let el2 = document.getElementById(n2.id);
    if (!el1 || !el2) return;

    let r1 = el1.getBoundingClientRect();
    let r2 = el2.getBoundingClientRect();

    let x1 = r1.left + r1.width/2 - containerRect.left + container.scrollLeft;
    let y1 = r1.bottom - containerRect.top + container.scrollTop;
    let x2 = r2.left + r2.width/2 - containerRect.left + container.scrollLeft;
    let y2 = r2.top - containerRect.top + container.scrollTop;

    let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#34495e');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
}