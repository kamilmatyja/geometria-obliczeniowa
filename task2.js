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
            this.p = p;
            this.q = q;
        } else {
            this.p = q;
            this.q = p;
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
    let segmentsListEl = document.getElementById('segmentsList');
    let orderListEl = document.getElementById('orderList');

    // Format linii: (x1, y1), (x2, y2)
    let lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let lineRegex = /^\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)\s*,\s*\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)$/;
    let invalidSegmentLines = [];
    let segmentCounter = 0;

    lines.forEach((line, idx) => {
        let match = line.match(lineRegex);
        if (!match) {
            invalidSegmentLines.push(idx + 1);
            return;
        }

        let p1 = new Point(parseFloat(match[1]), parseFloat(match[2]));
        let p2 = new Point(parseFloat(match[3]), parseFloat(match[4]));
        segmentCounter += 1;
        let name = `s_${segmentCounter}`;

        let s = new Segment(p1, p2, name);
        segmentMap.set(s.name, s);
        allPoints.push(p1, p2);
    });

    if (invalidSegmentLines.length > 0 || segmentMap.size === 0) {
        if (segmentsListEl) {
            segmentsListEl.innerText = 'Brak poprawnych odcinków wejściowych.';
        }
        if (orderListEl) {
            orderListEl.innerText = 'Porządek: { }';
        }
        document.getElementById('trapezoidMathLog').innerText =
            'Błędny format danych wejściowych. Użyj formatu linii: (x_1, y_1), (x_2, y_2).';
        return;
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

    let orderKeys = orderText
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0)
        .map(k => k.replace(/\s+/g, ''))
        .filter(k => /^\d+$/.test(k))
        .map(k => `s_${k}`);

    // Gdy pole jest puste, przyjmij domyślną kolejność rosnącą.
    if (orderKeys.length === 0) {
        orderKeys = Array.from(segmentMap.keys());
    }

    let segmentsToInsert = [];
    let seenOrder = new Set();
    for (let k of orderKeys) {
        if (!segmentMap.has(k) || seenOrder.has(k)) continue;
        seenOrder.add(k);
        segmentsToInsert.push(segmentMap.get(k));
    }

    if (segmentsToInsert.length === 0) {
        if (segmentsListEl) {
            let segmentLines = Array.from(segmentMap.values()).map(s => {
                let id = s.name.split('_')[1];
                return `S_${id} = {(${s.p.x}, ${s.p.y}), (${s.q.x}, ${s.q.y})}`;
            });
            segmentsListEl.innerText = segmentLines.join('\n');
        }
        if (orderListEl) {
            orderListEl.innerText = 'Porządek: { }';
        }
        document.getElementById('trapezoidMathLog').innerText =
            'Brak odcinków do wstawienia dla podanego porządku.';
        return;
    }

    if (segmentsListEl) {
        let segmentLines = Array.from(segmentMap.values()).map(s => {
            let id = s.name.split('_')[1];
            return `S_${id} = {(${s.p.x}, ${s.p.y}), (${s.q.x}, ${s.q.y})}`;
        });
        segmentsListEl.innerText = segmentLines.join('\n');
    }
    if (orderListEl) {
        orderListEl.innerText = `Porządek: {${segmentsToInsert.map(s => s.name).join(', ')}}`;
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

    let pTL = new Point(minX, maxY);
    pTL.name = "TL";
    let pTR = new Point(maxX, maxY);
    pTR.name = "TR";
    let pBL = new Point(minX, minY);
    pBL.name = "BL";
    let pBR = new Point(maxX, minY);
    pBR.name = "BR";

    let sTop = new Segment(pTL, pTR, "BB_TOP");
    let sBot = new Segment(pBL, pBR, "BB_BOT");

    let initialTrap = new Trapezoid(sTop, sBot, pBL, pBR);
    initialTrap.leaf = new DAGNode('LEAF', initialTrap);
    window.globalRoot = initialTrap.leaf;
    window.allTrapezoids.add(initialTrap);

    mathLog.push('Krok 0: Inicjalizacja bounding box i jednego trapezu początkowego T0.\n');

    for (let i = 0; i < segmentsToInsert.length; i++) {
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
    validTraps.forEach((t, i) => {
        t.name = letters[i] || ("T" + i);
    });

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

    let viewMinX = Math.min(minX, 0);
    let viewMaxX = Math.max(maxX, 0);
    let viewMinY = Math.min(minY, 0);
    let viewMaxY = Math.max(maxY, 0);

    let pad = 40;
    let scaleX = (canvas.width - 2 * pad) / Math.max(viewMaxX - viewMinX, 1);
    let scaleY = (canvas.height - 2 * pad) / Math.max(viewMaxY - viewMinY, 1);
    let scale = Math.min(scaleX, scaleY);

    let cx = canvas.width / 2 - ((viewMaxX + viewMinX) / 2) * scale;
    let cy = canvas.height / 2 + ((viewMaxY + viewMinY) / 2) * scale;

    function sX(x) {
        return cx + x * scale;
    }

    function sY(y) {
        return cy - y * scale;
    }

    let gridMinX = Math.floor(viewMinX);
    let gridMaxX = Math.ceil(viewMaxX);
    let gridMinY = Math.floor(viewMinY);
    let gridMaxY = Math.ceil(viewMaxY);

    ctx.strokeStyle = 'rgba(149, 165, 166, 0.35)';
    ctx.lineWidth = 1;
    for (let x = gridMinX; x <= gridMaxX; x++) {
        ctx.beginPath();
        ctx.moveTo(sX(x), 0);
        ctx.lineTo(sX(x), canvas.height);
        ctx.stroke();
    }
    for (let y = gridMinY; y <= gridMaxY; y++) {
        ctx.beginPath();
        ctx.moveTo(0, sY(y));
        ctx.lineTo(canvas.width, sY(y));
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(44, 62, 80, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sX(0), 0);
    ctx.lineTo(sX(0), canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, sY(0));
    ctx.lineTo(canvas.width, sY(0));
    ctx.stroke();

    ctx.fillStyle = 'rgba(44, 62, 80, 0.75)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (let x = gridMinX; x <= gridMaxX; x++) {
        if (x === 0) continue;
        ctx.fillText(String(x), sX(x) + 2, sY(0) - 4);
    }
    for (let y = gridMinY; y <= gridMaxY; y++) {
        if (y === 0) continue;
        ctx.fillText(String(y), sX(0) + 4, sY(y) - 2);
    }
    ctx.fillText('0', sX(0) + 4, sY(0) - 4);

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
        ctx.moveTo(lx, sY(t.top.evaluate(t.leftp.x)));
        ctx.lineTo(lx, sY(t.bot.evaluate(t.leftp.x)));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rx, sY(t.top.evaluate(t.rightp.x)));
        ctx.lineTo(rx, sY(t.bot.evaluate(t.rightp.x)));
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

    // 5) Ramka wewnętrzna obejmująca cały obszar trapezów (jak dawny bbox, ale wewnątrz wykresu)
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e6b86a';
    ctx.strokeRect(sX(minX), sY(maxY), sX(maxX) - sX(minX), sY(minY) - sY(maxY));

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
        ctx.arc(sx, sy, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.stroke();
    }
}

// ------ WIZUALIZACJA GRAFU (Renderowanie Drzewa) ------

function drawDAG() {
    let container = document.getElementById('dagFlowchart');
    container.innerHTML = '<div id="dag-content"><svg id="dag-svg"></svg></div>';
    let content = document.getElementById('dag-content');

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
        content.appendChild(row);
    }

    requestAnimationFrame(() => {
        let svg = document.getElementById('dag-svg');
        let contentRect = content.getBoundingClientRect();

        svg.setAttribute('width', content.scrollWidth);
        svg.setAttribute('height', content.scrollHeight);

        let allVisualNodes = [];
        for (let d in layersMap) {
            allVisualNodes.push(...layersMap[d]);
        }

        for (let n of allVisualNodes) {
            if (n.left) drawSVGLine(n, n.left, svg, content, contentRect);
            if (n.right) drawSVGLine(n, n.right, svg, content, contentRect);
        }

        // Skalujemy graf do szerokości kontenera zamiast pokazywać poziomy scroll.
        let availableWidth = Math.max(1, container.clientWidth - 2);
        let rawWidth = Math.max(1, content.scrollWidth);
        let scale = Math.min(1, availableWidth / rawWidth);

        content.style.transform = `translateX(-50%) scale(${scale})`;
        container.style.minHeight = `${Math.max(400, Math.ceil(content.scrollHeight * scale + 40))}px`;
    });
}

function drawSVGLine(n1, n2, svg, content, contentRect) {
    let el1 = document.getElementById(n1.id);
    let el2 = document.getElementById(n2.id);
    if (!el1 || !el2) return;

    let r1 = el1.getBoundingClientRect();
    let r2 = el2.getBoundingClientRect();

    let x1 = r1.left + r1.width / 2 - contentRect.left;
    let y1 = r1.bottom - contentRect.top;
    let x2 = r2.left + r2.width / 2 - contentRect.left;
    let y2 = r2.top - contentRect.top;

    let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#34495e');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(processTrapezoidalMap, 200);

    const task2Tab = document.getElementById('task2');
    if (!task2Tab) return;

    const observer = new MutationObserver(() => {
        if (task2Tab.classList.contains('active')) {
            // Gdy zakładka staje się widoczna, przeliczamy ponownie geometrię DAG.
            setTimeout(processTrapezoidalMap, 0);
        }
    });

    observer.observe(task2Tab, {attributes: true, attributeFilter: ['class']});

    window.addEventListener('resize', () => {
        if (task2Tab.classList.contains('active') && window.globalRoot) {
            drawDAG();
        }
    });
});
