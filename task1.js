// --- FUNKCJE POMOCNICZE MATEMATYCZNE ---

function isBelow(p, q) {
    return p.y < q.y || (p.y === q.y && p.x > q.x);
}

function isAbove(p, q) {
    return p.y > q.y || (p.y === q.y && p.x < q.x);
}

// Zwraca > 0 dla skrętu w lewo (kąt wew. < 180, CCW), < 0 dla skrętu w prawo (kąt wew. > 180)
function getTurn(prev, curr, next) {
    let v1x = curr.x - prev.x;
    let v1y = curr.y - prev.y;
    let v2x = next.x - curr.x;
    let v2y = next.y - curr.y;
    return (v1x * v2y - v1y * v2x);
}

// Litera/litery zgodnie z kolejnością wpisu w textarea: 0->A, 1->B, ... 25->Z, 26->AA
function getInputLabel(index) {
    let label = '';
    let n = index + 1;
    while (n > 0) {
        let rem = (n - 1) % 26;
        label = String.fromCharCode(65 + rem) + label;
        n = Math.floor((n - 1) / 26);
    }
    return label;
}

// GŁÓWNA FUNKCJA PRZETWARZAJĄCA
function processPolygon() {
    let input = document.getElementById('pointsInput').value.trim();
    let lines = input.split('\n');
    let pts = [];

    // Parsowanie
    lines.forEach((line, lineIndex) => {
        let parts = line.split(',');
        if (parts.length === 2) {
            pts.push({ x: parseFloat(parts[0].trim()), y: parseFloat(parts[1].trim()), sourceIndex: lineIndex });
        }
    });

    document.getElementById('inputList').innerText = pts
        .map(p => `${getInputLabel(p.sourceIndex)} = (${p.x}, ${p.y})`)
        .join('\n');

    if (pts.length < 3) {
        alert('Wielokąt musi mieć co najmniej 3 wierzchołki!');
        return;
    }

    // Ustalanie CCW (Pole ze wzoru Gaussa / Shoelace)
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
        let j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    // W klasycznym układzie kartezjańskim area > 0 oznacza CCW. Jeśli < 0 odwracamy.
    if (area < 0) pts.reverse();

    // Szukanie V1 (skrajny prawy)
    let maxXi = 0;
    for (let i = 1; i < pts.length; i++) {
        if (pts[i].x > pts[maxXi].x || (pts[i].x === pts[maxXi].x && pts[i].y < pts[maxXi].y)) {
            maxXi = i;
        }
    }

    // Przesunięcie tablicy, aby V1 był na indeksie 0 (czyli V_1 w notacji 1-based)
    pts = pts.slice(maxXi).concat(pts.slice(0, maxXi));

    let vertices = pts.map((p, index) => {
        return {
            id: index + 1,
            name: `V_${index + 1}`,
            inputLabel: getInputLabel(p.sourceIndex),
            x: p.x,
            y: p.y,
            originalIndex: index
        };
    });

    let N = vertices.length;

    // --- KLASYFIKACJA WIERZCHOŁKÓW ---
    vertices.forEach((v, i) => {
        let prev = vertices[(i - 1 + N) % N];
        let next = vertices[(i + 1) % N];

        let prevBelow = isBelow(prev, v);
        let nextBelow = isBelow(next, v);
        let prevAbove = isAbove(prev, v);
        let nextAbove = isAbove(next, v);

        let cp = getTurn(prev, v, next);
        let angleLessPi = cp > 0; // Skręt w lewo, wnętrze po lewej (czyli kąt wewn < 180)

        if (prevBelow && nextBelow && angleLessPi) v.type = 'Początkowy';
        else if (prevAbove && nextAbove && angleLessPi) v.type = 'Końcowy';
        else if (prevBelow && nextBelow && !angleLessPi) v.type = 'Dzielący';
        else if (prevAbove && nextAbove && !angleLessPi) v.type = 'Łączący';
        else v.type = 'Prawidłowy';

        // Pomocnicza flaga dla prawego/lewego brzegu w regularnym
        if (v.type === 'Prawidłowy') {
            v.interiorRight = isAbove(prev, v); // Ściśle wg algorytmu z PDF: jeśli idziemy w dół (prev jest wyżej), jesteśmy na lewym łańcuchu, więc wnętrze po prawej
        }
    });

    // Renderowanie tabeli
    let tb = document.getElementById('vertexTable');
    tb.innerHTML = '';
    vertices.forEach(v => {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td><b>${v.name}</b></td><td>${v.inputLabel} = (${v.x}, ${v.y})</td><td>${v.type}</td>`;
        tb.appendChild(tr);
    });

    // --- KOLEJKA PRIORYTETOWA Q ---
    let Q = [...vertices].sort((a, b) => {
        if (a.y !== b.y) return b.y - a.y; // Y malejąco
        return a.x - b.x;                  // X rosnąco dla tych samych Y
    });
    document.getElementById('queueData').innerText = 'Q = { ' + Q.map(v => v.name).join(', ') + ' }';

    // --- ALGORYTM MAKEMONOTONE ---
    let T = []; // Stan drzewa T (aktywne krawędzie). Trzymamy jako tablicę obiektów
    let helpers = {}; // Mapa edge_name -> vertex_name
    let diagonals = [];
    let log = [];

    // Funkcja szukająca krawędzi bezpośrednio po lewej stronie w drzewie T
    function getLeftEdge(vi) {
        let bestEdge = null;
        let maxX = -Infinity;
        let testY = vi.y + 0.001; // Linia omiatająca minimalnie powyżej, by uniknąć kolizji w samym wierzchołku

        for (let edge of T) {
            let u = edge.start;
            let w = edge.end;
            let minY = Math.min(u.y, w.y);
            let maxY = Math.max(u.y, w.y);
            if (testY >= minY && testY <= maxY && u.y !== w.y) {
                let xInt = u.x + (testY - u.y) * (w.x - u.x) / (w.y - u.y);
                if (xInt < vi.x) {
                    if (xInt > maxX) {
                        maxX = xInt;
                        bestEdge = edge;
                    }
                }
            }
        }
        return bestEdge;
    }

    log.push('ROZPOCZĘCIE ALGORYTMU MAKEMONOTONE(P)\n');

    for (let vi of Q) {
        let i = vi.originalIndex;
        let prev = vertices[(i - 1 + N) % N];
        let next = vertices[(i + 1) % N];

        let ei = { start: vi, end: next, name: `e_${vi.id}` };
        let e_prev = { start: prev, end: vi, name: `e_${prev.id}` };

        log.push(`Badamy wierzchołek ${vi.name} - ${vi.type.toLowerCase()} (i = ${vi.id}):`);

        if (vi.type === 'Początkowy') {
            T.push(ei);
            helpers[ei.name] = vi;
            log.push(`  Wstawiono ${ei.name} do T.`);
            log.push(`  Ustawiono pomocnik(${ei.name}) = ${vi.name}`);
        }
        else if (vi.type === 'Końcowy') {
            if (helpers[e_prev.name] && helpers[e_prev.name].type === 'Łączący') {
                diagonals.push([vi, helpers[e_prev.name]]);
                log.push(`  Wstawiono przekątną łączącą ${vi.name} z pomocnik(e_${prev.id}) = ${helpers[e_prev.name].name}`);
            }
            T = T.filter(e => e.name !== e_prev.name);
            log.push(`  Usunięto ${e_prev.name} z T`);
        }
        else if (vi.type === 'Dzielący') {
            let ej = getLeftEdge(vi);
            if (ej) {
                diagonals.push([vi, helpers[ej.name]]);
                log.push(`  Wyszukano w T krawędź na lewo: ${ej.name}. Wstawiono przekątną łączącą ${vi.name} z pomocnik(${ej.name}) = ${helpers[ej.name].name}`);
                helpers[ej.name] = vi;
                log.push(`  Zaktualizowano pomocnik(${ej.name}) = ${vi.name}`);
            }
            T.push(ei);
            helpers[ei.name] = vi;
            log.push(`  Wstawiono ${ei.name} do T. Ustawiono pomocnik(${ei.name}) = ${vi.name}`);
        }
        else if (vi.type === 'Łączący') {
            if (helpers[e_prev.name] && helpers[e_prev.name].type === 'Łączący') {
                diagonals.push([vi, helpers[e_prev.name]]);
                log.push(`  Wstawiono przekątną łączącą ${vi.name} z pomocnik(e_${prev.id}) = ${helpers[e_prev.name].name}`);
            }
            T = T.filter(e => e.name !== e_prev.name);
            log.push(`  Usunięto ${e_prev.name} z T`);

            let ej = getLeftEdge(vi);
            if (ej) {
                if (helpers[ej.name] && helpers[ej.name].type === 'Łączący') {
                    diagonals.push([vi, helpers[ej.name]]);
                    log.push(`  Znaleziono na lewo ${ej.name}. Wstawiono przekątną łączącą ${vi.name} z pomocnik(${ej.name}) = ${helpers[ej.name].name}`);
                }
                helpers[ej.name] = vi;
                log.push(`  Zaktualizowano pomocnik(${ej.name}) = ${vi.name}`);
            }
        }
        else if (vi.type === 'Prawidłowy') {
            if (vi.interiorRight) { // Wnętrze po prawej
                log.push(`  Wnętrze P leży na prawo od ${vi.name}`);
                if (helpers[e_prev.name] && helpers[e_prev.name].type === 'Łączący') {
                    diagonals.push([vi, helpers[e_prev.name]]);
                    log.push(`  Wstawiono przekątną łączącą ${vi.name} z pomocnik(e_${prev.id}) = ${helpers[e_prev.name].name}`);
                }
                T = T.filter(e => e.name !== e_prev.name);
                log.push(`  Usunięto ${e_prev.name} z T`);
                T.push(ei);
                helpers[ei.name] = vi;
                log.push(`  Wstawiono ${ei.name} do T. Ustawiono pomocnik(${ei.name}) = ${vi.name}`);
            } else { // Wnętrze po lewej
                log.push(`  Wnętrze P leży na lewo od ${vi.name}`);
                let ej = getLeftEdge(vi);
                if (ej) {
                    if (helpers[ej.name] && helpers[ej.name].type === 'Łączący') {
                        diagonals.push([vi, helpers[ej.name]]);
                        log.push(`  Znaleziono na lewo ${ej.name}. Wstawiono przekątną łączącą ${vi.name} z pomocnik(${ej.name}) = ${helpers[ej.name].name}`);
                    }
                    helpers[ej.name] = vi;
                    log.push(`  Zaktualizowano pomocnik(${ej.name}) = ${vi.name}`);
                }
            }
        }

        let tNames = T.map(e => e.name).join(', ');
        if (tNames === '') tNames = 'puste';
        log.push(`  --> T = { ${tNames} }\n`);
    }

    document.getElementById('monotoneLog').innerText = log.join('\n');

    // --- EKSTRAKCJA TWARZY (MONOTONICZNYCH WIELOKĄTÓW) I TRIANGULACJA ---
    let tLog = ['ROZPOCZĘCIE TRIANGULACJI (Kolejność przekątnych na stosie)\n'];
    let finalTriDiagonals = [];

    // Używamy kluczy nieukierunkowanych, by nie dublować tych samych odcinków
    let existingEdges = new Set();
    function edgeKey(a, b) {
        return a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
    }
    function addTriDiagonal(a, b) {
        if (a.id === b.id) return false;
        let key = edgeKey(a, b);
        if (existingEdges.has(key)) return false;
        existingEdges.add(key);
        finalTriDiagonals.push([a, b]);
        return true;
    }

    // Zbuduj graf z krawędzi brzegu i przekątnych
    let adjacency = {};
    for (let i = 0; i < N; i++) {
        let u = vertices[i];
        let v = vertices[(i + 1) % N];
        if (!adjacency[u.id]) adjacency[u.id] = [];
        if (!adjacency[v.id]) adjacency[v.id] = [];
        adjacency[u.id].push(v.id);
        adjacency[v.id].push(u.id);
        existingEdges.add(edgeKey(u, v));
    }
    for (let d of diagonals) {
        adjacency[d[0].id].push(d[1].id);
        adjacency[d[1].id].push(d[0].id);
        existingEdges.add(edgeKey(d[0], d[1]));
    }

    // Sortuj sąsiadów wokół wierzchołka wg kąta (dla odnajdywania cykli/ścian)
    for (let uId in adjacency) {
        let uNode = vertices.find(v => v.id == uId);
        adjacency[uId].sort((v1, v2) => {
            let n1 = vertices.find(v => v.id == v1);
            let n2 = vertices.find(v => v.id == v2);
            let ang1 = Math.atan2(n1.y - uNode.y, n1.x - uNode.x);
            let ang2 = Math.atan2(n2.y - uNode.y, n2.x - uNode.x);
            return ang1 - ang2;
        });
    }

    let visitedHalfEdges = new Set();
    let seenFaceKeys = new Set();
    let monotoneFaces = [];

    // Obchodzenie grafu (struktura DCEL) by znaleźć cykle
    for (let u in adjacency) {
        for (let v of adjacency[u]) {
            let he = `${u}-${v}`;
            if (visitedHalfEdges.has(he)) continue;

            let currU = parseInt(u);
            let currV = parseInt(v);
            let faceIds = [currU];
            let safe = 0;

            while (true) {
                visitedHalfEdges.add(`${currU}-${currV}`);
                faceIds.push(currV);

                let neighbors = adjacency[currV];
                let revIndex = neighbors.indexOf(currU);
                let nextIndex = (revIndex - 1 + neighbors.length) % neighbors.length; // Poprzedni po kącie = CCW obrót wewnątrz ściany
                let nextV = neighbors[nextIndex];

                currU = currV;
                currV = nextV;
                if (currU === parseInt(u) && currV === parseInt(v)) break;
                if (safe++ > 100) break;
            }
            faceIds.pop();

            // Tylko wewnętrzne figury mają pole > 0 (CCW)
            let fArea = 0;
            for (let k = 0; k < faceIds.length; k++) {
                let p1 = vertices.find(n => n.id == faceIds[k]);
                let p2 = vertices.find(n => n.id == faceIds[(k + 1) % faceIds.length]);
                fArea += p1.x * p2.y - p2.x * p1.y;
            }

            if (fArea > 0 && faceIds.length > 3) {
                // Unikalny klucz ściany niezależny od punktu startu i kierunku zapisu
                let minPos = 0;
                for (let i = 1; i < faceIds.length; i++) {
                    if (faceIds[i] < faceIds[minPos]) minPos = i;
                }
                let norm = faceIds.slice(minPos).concat(faceIds.slice(0, minPos));
                let rev = [norm[0]].concat(norm.slice(1).reverse());
                let keyA = norm.join('-');
                let keyB = rev.join('-');
                let faceKey = keyA < keyB ? keyA : keyB;
                if (!seenFaceKeys.has(faceKey)) {
                    seenFaceKeys.add(faceKey);
                    monotoneFaces.push(faceIds.map(id => vertices.find(n => n.id == id)));
                }
            }
        }
    }

    tLog.push(`Znaleziono ${monotoneFaces.length} wielokątów monotonicznych do striangulowania.`);

    // Triangulacja dla każdej wyodrębnionej części monotonicznej (wprost ze slajdów PDF)
    monotoneFaces.forEach((face, fIndex) => {
        tLog.push(`\n=== Triangulacja części ${fIndex + 1} (${face.map(v => v.name).join(', ')}) ===`);

        let sortedFace = [...face].sort((a, b) => {
            if (a.y !== b.y) return b.y - a.y;
            return b.x - a.x; // Dla równych Y: prawy wierzchołek najpierw (stabilizuje przypadki degeneracyjne)
        });

        let top = sortedFace[0];
        let bottom = sortedFace[sortedFace.length - 1];

        // Przypisz lewy/prawy łańcuch przez dwa przejścia między top i bottom
        let chain = {};
        let m = face.length;
        let topIdx = face.findIndex(v => v.id === top.id);
        let bottomIdx = face.findIndex(v => v.id === bottom.id);

        let forward = [face[topIdx]];
        let idx = topIdx;
        while (idx !== bottomIdx) {
            idx = (idx + 1) % m;
            forward.push(face[idx]);
        }

        let backward = [face[topIdx]];
        idx = topIdx;
        while (idx !== bottomIdx) {
            idx = (idx - 1 + m) % m;
            backward.push(face[idx]);
        }

        function chainScore(path) {
            let sum = 0;
            let cnt = 0;
            for (let i = 1; i < path.length - 1; i++) {
                let p = path[i];
                let side = (bottom.x - top.x) * (p.y - top.y) - (bottom.y - top.y) * (p.x - top.x);
                sum += side;
                cnt++;
            }
            return cnt ? sum / cnt : 0;
        }

        let forwardIsLeft = chainScore(forward) >= chainScore(backward);
        let leftPath = forwardIsLeft ? forward : backward;
        let rightPath = forwardIsLeft ? backward : forward;

        for (let i = 1; i < leftPath.length - 1; i++) chain[leftPath[i].id] = 'LEFT';
        for (let i = 1; i < rightPath.length - 1; i++) chain[rightPath[i].id] = 'RIGHT';
        chain[bottom.id] = 'BOTTOM';
        chain[top.id] = 'TOP';

        let stack = [sortedFace[0], sortedFace[1]];
        tLog.push(`2. Inicjuj pusty stos S i włóż na niego u1, u2: [${stack.map(v => v.name).join(', ')}]`);

        for (let j = 2; j < sortedFace.length - 1; j++) {
            let uj = sortedFace[j];
            let uChain = chain[uj.id];
            let topNode = stack[stack.length - 1];
            let topChain = chain[topNode.id];

            tLog.push(`\n3-9. Badamy wierzchołek ${uj.name} (Łańcuch: ${uChain})`);

            if (uChain !== topChain) { // różne łańcuchy
                tLog.push(' -> Różne łańcuchy. Zdejmujemy wszystkie z S.');
                while (stack.length > 0) {
                    let popped = stack.pop();
                    // Bez przekątnej do ostatniego zdjętego (adjacent do u_j)
                    if (stack.length > 0 && addTriDiagonal(uj, popped)) {
                        tLog.push(`    Wstaw do D przekątną: ${uj.name} - ${popped.name}`);
                    }
                }
                stack.push(sortedFace[j - 1]);
                stack.push(uj);
                tLog.push(`    Włóż uj-1 i uj na stos: [${stack.map(v => v.name).join(', ')}]`);
            } else { // ten sam łańcuch
                tLog.push(' -> Ten sam łańcuch. Zdejmujemy z S wierzchołki, dopóki tworzą przekątne wewnątrz.');
                let lastPopped = stack.pop();
                while (stack.length > 0) {
                    let currentTop = stack[stack.length - 1];
                    // Test orientacji zgodny z klasycznym wariantem dla y-monotonicznego CCW
                    let turn = getTurn(currentTop, lastPopped, uj);
                    let isInside = (uChain === 'LEFT') ? (turn < 0) : (turn > 0);

                    if (isInside) {
                        if (addTriDiagonal(uj, currentTop)) {
                            tLog.push(`    Wstaw do D przekątną: ${uj.name} - ${currentTop.name}`);
                        }
                        lastPopped = stack.pop();
                    } else {
                        break;
                    }
                }
                stack.push(lastPopped);
                stack.push(uj);
                tLog.push(`    Włóż ostatni zdjęty oraz uj na stos: [${stack.map(v => v.name).join(', ')}]`);
            }
        }

        // 11. Ostatni wierzchołek
        let un = sortedFace[sortedFace.length - 1];
        tLog.push(`\n11. Dodajemy przekątne z un (${un.name}) do wszystkich na stosie oprócz pierwszego i ostatniego.`);
        stack.pop(); // usuń ostatni
        stack.shift(); // usuń pierwszy
        while (stack.length > 0) {
            let popped = stack.pop();
            if (addTriDiagonal(un, popped)) {
                tLog.push(`    Wstaw do D przekątną: ${un.name} - ${popped.name}`);
            }
        }
    });

    if (monotoneFaces.length === 0) {
        tLog.push('Brak złożonych figur do triangulacji (wielokąt jest już prosty lub wystąpił błąd topologii).');
    }

    document.getElementById('triangulationLog').innerText = tLog.join('\n');

    // --- RYSOWANIE CANVAS ---
    drawCanvas(vertices, diagonals, finalTriDiagonals);
}

function drawCanvas(vertices, diagonals, finalTriDiagonals) {
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (vertices.length === 0) return;

    // Przeliczenie układu współrzędnych (skalowanie i centrowanie)
    let minX = Math.min(...vertices.map(v => v.x));
    let maxX = Math.max(...vertices.map(v => v.x));
    let minY = Math.min(...vertices.map(v => v.y));
    let maxY = Math.max(...vertices.map(v => v.y));

    let pad = 40;
    let scale = Math.min((canvas.width - 2 * pad) / (maxX - minX || 1), (canvas.height - 2 * pad) / (maxY - minY || 1));

    let getCx = (x) => pad + (x - minX) * scale;
    let getCy = (y) => canvas.height - pad - (y - minY) * scale; // Y odwrócone!

    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    // Rysuj krawędzie wielokąta
    ctx.beginPath();
    ctx.moveTo(getCx(vertices[0].x), getCy(vertices[0].y));
    for (let i = 1; i <= vertices.length; i++) {
        let v = vertices[i % vertices.length];
        ctx.lineTo(getCx(v.x), getCy(v.y));
    }
    ctx.strokeStyle = '#2c3e50';
    ctx.stroke();
    ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
    ctx.fill();

    // Etykiety krawedzi bazowego wielokata: e_i dla odcinka V_i -> V_(i+1)
    let centerX = vertices.reduce((acc, v) => acc + getCx(v.x), 0) / vertices.length;
    let centerY = vertices.reduce((acc, v) => acc + getCy(v.y), 0) / vertices.length;
    ctx.fillStyle = '#34495e';
    ctx.font = '11px Arial';
    for (let i = 0; i < vertices.length; i++) {
        let a = vertices[i];
        let b = vertices[(i + 1) % vertices.length];
        let ax = getCx(a.x); let ay = getCy(a.y);
        let bx = getCx(b.x); let by = getCy(b.y);
        let midX = (ax + bx) / 2;
        let midY = (ay + by) / 2;

        let dx = bx - ax;
        let dy = by - ay;
        let len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len;
        let ny = dx / len;
        let offset = 12;

        let c1x = midX + nx * offset;
        let c1y = midY + ny * offset;
        let c2x = midX - nx * offset;
        let c2y = midY - ny * offset;

        let d1 = (c1x - centerX) * (c1x - centerX) + (c1y - centerY) * (c1y - centerY);
        let d2 = (c2x - centerX) * (c2x - centerX) + (c2y - centerY) * (c2y - centerY);
        let labelX = d1 > d2 ? c1x : c2x;
        let labelY = d1 > d2 ? c1y : c2y;

        ctx.fillText(`e_${i + 1}`, labelX + 2, labelY - 2);
    }

    // Rysuj przekątne MakeMonotone
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    for (let d of diagonals) {
        ctx.moveTo(getCx(d[0].x), getCy(d[0].y));
        ctx.lineTo(getCx(d[1].x), getCy(d[1].y));
    }
    ctx.strokeStyle = '#95a5a6';
    ctx.stroke();

    // Rysuj przekątne Triangulacji
    ctx.beginPath();
    ctx.setLineDash([2, 4]);
    for (let d of finalTriDiagonals) {
        ctx.moveTo(getCx(d[0].x), getCy(d[0].y));
        ctx.lineTo(getCx(d[1].x), getCy(d[1].y));
    }
    ctx.strokeStyle = '#e74c3c';
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash

    // Rysuj wierzchołki i etykiety
    for (let v of vertices) {
        let cx = getCx(v.x);
        let cy = getCy(v.y);

        ctx.fillStyle = '#fff'; // Domyślne

        ctx.beginPath();
        if (v.type === 'Początkowy') {
            ctx.fillStyle = '#3498db';
            ctx.rect(cx - 5, cy - 5, 10, 10);
            ctx.fill();
        } else if (v.type === 'Końcowy') {
            ctx.fillStyle = '#e74c3c';
            ctx.rect(cx - 5, cy - 5, 10, 10);
            ctx.fill();
        } else if (v.type === 'Dzielący') {
            ctx.fillStyle = '#f39c12';
            ctx.moveTo(cx, cy - 7);
            ctx.lineTo(cx + 7, cy + 5);
            ctx.lineTo(cx - 7, cy + 5);
            ctx.fill();
        } else if (v.type === 'Łączący') {
            ctx.fillStyle = '#9b59b6';
            ctx.moveTo(cx, cy + 7);
            ctx.lineTo(cx + 7, cy - 5);
            ctx.lineTo(cx - 7, cy - 5);
            ctx.fill();
        } else {
            ctx.fillStyle = '#2ecc71';
            ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Etykiety: numer V_n + litera z kolejnosci wejscia
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(`${v.name} (${v.inputLabel})`, cx + 8, cy - 8);
    }
}

window.processPolygon = processPolygon;
window.addEventListener('DOMContentLoaded', processPolygon);

