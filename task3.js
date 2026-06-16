// --- task3.js ---

// --- FUNKCJE POMOCNICZE DO OBLICZEŃ MATEMATYCZNYCH I LOGOWANIA --- //

// Największy wspólny dzielnik (NWD)
function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) {
        let t = b;
        b = a % b;
        a = t;
    }
    return a;
}

// Formatuje równanie Ax + By + C = 0 do ładnego stringa
function formatEq(A, B, C) {
    let terms = [];
    if (A !== 0) {
        if (A === 1) terms.push("x");
        else if (A === -1) terms.push("-x");
        else terms.push(A + "x");
    }
    if (B !== 0) {
        if (B === 1) terms.push(terms.length > 0 ? "+ y" : "y");
        else if (B === -1) terms.push(terms.length > 0 ? "- y" : "-y");
        else if (B > 0) terms.push(terms.length > 0 ? "+ " + B + "y" : B + "y");
        else terms.push(terms.length > 0 ? "- " + Math.abs(B) + "y" : B + "y");
    }
    if (C !== 0) {
        if (C > 0) terms.push(terms.length > 0 ? "+ " + C : C);
        else terms.push(terms.length > 0 ? "- " + Math.abs(C) : C);
    }
    if (terms.length === 0) return "0 = 0";
    return terms.join(" ") + " = 0";
}

function prettyNum(n) {
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(3);
}

// Wyznacza symetralną dla dwóch punktów i generuje kroki w logu
function computeBisectorMath(A, B) {
    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;

    let dx = B.x - A.x;
    let dy = B.y - A.y;

    // Równanie prostej AB w postaci ogólnej: Lx*x + Ly*y + Lc = 0
    const Lx = A.y - B.y;
    const Ly = B.x - A.x;
    const Lc = A.x * B.y - B.x * A.y;

    // Wyprowadzenie prostej prostopadłej z postaci ogólnej do postaci z liczbami całkowitymi
    // wektor prostopadły to [-dy, dx], więc postać ogólna to: (2*dx)*x + (2*dy)*y + C = 0
    let A_gen = 2 * dx;
    let B_gen = 2 * dy;
    let C_gen = (A.x * A.x - B.x * B.x) + (A.y * A.y - B.y * B.y);

    // Sprowadzanie do najprostszej postaci z liczbami całkowitymi
    // Mnożymy x10, aby usunąć ewentualne ułamki ze współrzędnych dziesiętnych
    let mult = 1;
    while ((Math.abs(A_gen * mult % 1) > 1e-5 || Math.abs(B_gen * mult % 1) > 1e-5 || Math.abs(C_gen * mult % 1) > 1e-5) && mult <= 1000) {
        mult *= 10;
    }
    A_gen = Math.round(A_gen * mult);
    B_gen = Math.round(B_gen * mult);
    C_gen = Math.round(C_gen * mult);

    let d = gcd(gcd(A_gen, B_gen), C_gen) || 1;
    if (A_gen < 0 || (A_gen === 0 && B_gen < 0)) d = -d; // dla estetyki (żeby zaczynało się od plusa)

    A_gen /= d;
    B_gen /= d;
    C_gen /= d;

    const eqStr = formatEq(A_gen, B_gen, C_gen);
    const label = `${A.label}${B.label}`;

    let log = `\n[Symetralna ${label}]\n`;
    log += `Odcinek: ${A.label}(${A.x}, ${A.y}), ${B.label}(${B.x}, ${B.y})\n`;
    log += `Podstawienie do wzoru prostej ${label}: (y - ${prettyNum(A.y)})(${prettyNum(B.x - A.x)}) - (${prettyNum(B.y - A.y)})(x - ${prettyNum(A.x)}) = 0\n`;
    log += `Prosta ${label} (postać ogólna): ${formatEq(Lx, Ly, Lc)}\n`;
    if (dx !== 0) {
        const mAB = dy / dx;
        const bAB = A.y - mAB * A.x;
        log += `m_${label} = (${prettyNum(B.y)} - ${prettyNum(A.y)})/(${prettyNum(B.x)} - ${prettyNum(A.x)}) = ${prettyNum(mAB)}\n`;
        log += `Prosta ${label} (postać kierunkowa): y = ${prettyNum(mAB)}x ${bAB >= 0 ? '+' : '-'} ${prettyNum(Math.abs(bAB))}\n`;
    } else {
        log += `Prosta ${label} jest pionowa: x = ${prettyNum(A.x)}\n`;
    }

    log += `Srodek S = ((${prettyNum(A.x)}+${prettyNum(B.x)})/2, (${prettyNum(A.y)}+${prettyNum(B.y)})/2) = (${mx.toFixed(2)}, ${my.toFixed(2)})\n`;
    log += `Wektor kierunkowy prostej ${label}: [${dx.toFixed(2)}, ${dy.toFixed(2)}]\n`;

    if (dy === 0) {
        log += `Symetralna prostopadla do poziomej ${label} jest pionowa: x = ${prettyNum(mx)}\n`;
    } else if (dx === 0) {
        log += `Symetralna prostopadla do pionowej ${label} jest pozioma: y = ${prettyNum(my)}\n`;
    } else {
        const mPerp = -dx / dy;
        const bPerp = my - mPerp * mx;
        log += `m_p = -1/m_${label} = ${prettyNum(mPerp)}\n`;
        log += `b = y_S - m_p*x_S = ${prettyNum(my)} - (${prettyNum(mPerp)})*(${prettyNum(mx)}) = ${prettyNum(bPerp)}\n`;
        log += `Symetralna (postać kierunkowa): y = ${prettyNum(mPerp)}x ${bPerp >= 0 ? '+' : '-'} ${prettyNum(Math.abs(bPerp))}\n`;
    }

    log += `Symetralna ${label} w postaci ogólnej:\n`;
    log += `=> ${eqStr}\n`;

    return {A: A_gen, B: B_gen, C: C_gen, str: eqStr, log: log, label: label};
}

// Oblicza punkt przecięcia z użyciem wyznaczników Cramera i loguje obliczenia
function intersectCramerMath(eq1, eq2) {
    const A1 = eq1.A, B1 = eq1.B, C1 = -eq1.C; // Ax + By = -C
    const A2 = eq2.A, B2 = eq2.B, C2 = -eq2.C;

    const W = A1 * B2 - A2 * B1;
    const Wx = C1 * B2 - C2 * B1;
    const Wy = A1 * C2 - A2 * C1;

    let log = `\n[Szukamy punktu przecięcia Symetralnej ${eq1.label} i Symetralnej ${eq2.label}]\n`;
    log += `Układ równań (wyznaczniki Cramera):\n`;
    log += `{ ${formatEq(A1, B1, -C1)}\n`;
    log += `{ ${formatEq(A2, B2, -C2)}\n`;
    log += `Rozdzielamy wyraz wolny na prawą stronę:\n`;
    log += `{ ${A1}x ${B1 >= 0 ? '+' : '-'} ${Math.abs(B1)}y = ${C1}\n`;
    log += `{ ${A2}x ${B2 >= 0 ? '+' : '-'} ${Math.abs(B2)}y = ${C2}\n`;

    if (W === 0) {
        log += `Wyznacznik W = 0. Proste są równoległe (brak przecięcia).\n`;
        return {valid: false, log: log};
    }

    log += `W  = | ${A1}  ${B1} | = (${A1})*(${B2}) - (${A2})*(${B1}) = ${W}\n`;
    log += `     | ${A2}  ${B2} |\n`;
    log += `Wx = | ${C1}  ${B1} | = (${C1})*(${B2}) - (${C2})*(${B1}) = ${Wx}\n`;
    log += `     | ${C2}  ${B2} |\n`;
    log += `Wy = | ${A1}  ${C1} | = (${A1})*(${C2}) - (${A2})*(${C1}) = ${Wy}\n`;
    log += `     | ${A2}  ${C2} |\n`;

    const x = Wx / W;
    const y = Wy / W;

    log += `\nx = Wx / W = ${Wx} / ${W} = ${Number.isInteger(x) ? x : x.toFixed(3)}\n`;
    log += `y = Wy / W = ${Wy} / ${W} = ${Number.isInteger(y) ? y : y.toFixed(3)}\n`;
    log += `==> Punkt Wierzchołka: (${x.toFixed(3)}, ${y.toFixed(3)})\n`;

    return {valid: true, x: x, y: y, log: log};
}

// --- GŁÓWNA FUNKCJA PROCESUJĄCA --- //

function processVoronoi() {
    const input = document.getElementById('voronoiInput').value;
    const points = parseVoronoiInput(input);
    const logEl = document.getElementById('voronoiLog');

    if (points.length < 3) {
        logEl.innerHTML = "Wymagane są minimum 3 punkty, aby poprawnie wygenerować diagram.";
        return;
    }

    let logHtml = "ROZPOCZYNAM OBLICZENIA DIAGRAMU VORONOI:\n";
    points.forEach(p => logHtml += `Centrum ${p.label} = (${p.x}, ${p.y})\n`);
    logHtml += "\n----------------------------------------------------\n";
    logHtml += "KROK 1. WYZNACZANIE RÓWNAŃ SYMETRALNYCH\n";
    logHtml += "----------------------------------------------------\n";
    logHtml += "WZORY OGÓLNE (stosowane dla każdej pary punktów):\n";
    logHtml += "1) Prosta przez dwa punkty: (y - y1)(x2 - x1) - (y2 - y1)(x - x1) = 0\n";
    logHtml += "2) Nachylenie: m = (y2 - y1)/(x2 - x1)\n";
    logHtml += "3) Środek odcinka: S = ((x1+x2)/2, (y1+y2)/2)\n";
    logHtml += "4) Nachylenie symetralnej: m_p = -1/m (dla niepionowej i niepoziomej)\n";
    logHtml += "5) Postać kierunkowa: y = m_p*x + b, gdzie b = y_S - m_p*x_S\n";
    logHtml += "6) Postać ogólna: Ax + By + C = 0\n\n";

    // 1. Wyliczanie symetralnych wszystkich par i generowanie logów
    const bisectors = {};
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const mathData = computeBisectorMath(points[i], points[j]);
            bisectors[mathData.label] = mathData;
            logHtml += mathData.log;
        }
    }

    logHtml += "\n----------------------------------------------------\n";
    logHtml += "KROK 2. SZUKANIE WIERZCHOŁKÓW (PRZECIĘCIA SYMETRALNYCH)\n";
    logHtml += "----------------------------------------------------\n";
    logHtml += "Wierzchołek Voronoi to środek pustego okręgu opisanego na trzech centrach.\n\n";

    // 2. Wyszukiwanie pustych okręgów opisanych dla każdej trójki
    const vertices = [];
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            for (let k = j + 1; k < points.length; k++) {
                const A = points[i];
                const B = points[j];
                const C = points[k];

                // Użyjemy do opisu na logu symetralnych AB i BC
                const eqAB = bisectors[`${A.label}${B.label}`];
                const eqBC = bisectors[`${B.label}${C.label}`];

                const intersectData = intersectCramerMath(eqAB, eqBC);
                if (!intersectData.valid) continue; // są współliniowe

                const vx = intersectData.x;
                const vy = intersectData.y;
                const r = Math.hypot(A.x - vx, A.y - vy);

                // Sprawdzenie "pustego okręgu"
                let isEmpty = true;
                for (let m = 0; m < points.length; m++) {
                    if (m === i || m === j || m === k) continue;
                    const d = Math.hypot(points[m].x - vx, points[m].y - vy);
                    if (d < r - 1e-7) {
                        isEmpty = false;
                        break;
                    }
                }

                if (isEmpty) {
                    const v = {
                        x: vx,
                        y: vy,
                        sites: [A, B, C],
                        id: `V${vertices.length + 1}`
                    };
                    vertices.push(v);

                    // Skoro to prawidłowy wierzchołek Voronoi, wypisujemy go do logu:
                    logHtml += `--- Sprawdzanie Trójki: ${A.label}, ${B.label}, ${C.label} ---\n`;
                    logHtml += intersectData.log;
                    logHtml += `Okrąg o środku w wierzchołku i promieniu R=${r.toFixed(3)} jest PUSTY.\nZATWIERDZONO WIERZCHOŁEK!\n\n`;
                }
            }
        }
    }

    // 3. Wyznaczanie krawędzi do renderowania
    const edges = [];

    // Złączenie wierzchołków
    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            const sharedSites = vertices[i].sites.filter(s1 =>
                vertices[j].sites.some(s2 => s2.label === s1.label)
            );
            if (sharedSites.length === 2) {
                edges.push({type: 'segment', v1: vertices[i], v2: vertices[j]});
            }
        }
    }

    // Półproste (krawędzie idące w nieskończoność)
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const A = points[i];
            const B = points[j];

            const connectedVertices = vertices.filter(v =>
                v.sites.some(s => s.label === A.label) &&
                v.sites.some(s => s.label === B.label)
            );

            if (connectedVertices.length === 1) {
                const V = connectedVertices[0];
                const ray = calculateRay(V, A, B);
                edges.push({type: 'ray', v1: V, dx: ray.dx, dy: ray.dy});
            }
        }
    }

    logEl.innerHTML = logHtml;
    drawVoronoi(points, vertices, edges);
}

function parseVoronoiInput(input) {
    const lines = input.trim().split('\n');
    const points = [];
    const regex = /([a-zA-Z0-9]+)\s*=\s*\(([^,]+),([^)]+)\)|([^,]+),(.+)/;

    let defaultLabelCharCode = 65;

    lines.forEach(line => {
        const match = line.match(regex);
        if (match) {
            let label, x, y;
            if (match[1]) {
                label = match[1];
                x = parseFloat(match[2]);
                y = parseFloat(match[3]);
            } else {
                label = String.fromCharCode(defaultLabelCharCode++);
                x = parseFloat(match[4]);
                y = parseFloat(match[5]);
            }
            if (!isNaN(x) && !isNaN(y)) {
                points.push({label, x, y});
            }
        }
    });
    return points;
}

function calculateRay(V, A, B) {
    let dx = -(B.y - A.y);
    let dy = (B.x - A.x);
    const thirdSite = V.sites.find(s => s.label !== A.label && s.label !== B.label);
    const pTestX = V.x + dx;
    const pTestY = V.y + dy;

    const distToThird = Math.hypot(pTestX - thirdSite.x, pTestY - thirdSite.y);
    const distToA = Math.hypot(pTestX - A.x, pTestY - A.y);

    if (distToThird < distToA) {
        dx = -dx;
        dy = -dy;
    }
    const len = Math.hypot(dx, dy);
    return {dx: dx / len, dy: dy / len};
}

function drawVoronoi(points, vertices, edges) {
    const canvas = document.getElementById('voronoiCanvas');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });
    vertices.forEach(v => {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
    });

    minX = Math.min(minX, 0);
    maxX = Math.max(maxX, 0);
    minY = Math.min(minY, 0);
    maxY = Math.max(maxY, 0);

    const pad = 2;
    minX -= pad;
    maxX += pad;
    minY -= pad;
    maxY += pad;

    const scaleX = canvas.width / (maxX - minX);
    const scaleY = canvas.height / (maxY - minY);
    const scale = Math.min(scaleX, scaleY) * 0.9;

    const cx = canvas.width / 2 - ((maxX + minX) / 2) * scale;
    const cy = canvas.height / 2 + ((maxY + minY) / 2) * scale;

    const mapX = x => cx + x * scale;
    const mapY = y => cy - y * scale;

    const gridMinX = Math.floor(minX);
    const gridMaxX = Math.ceil(maxX);
    const gridMinY = Math.floor(minY);
    const gridMaxY = Math.ceil(maxY);

    ctx.strokeStyle = 'rgba(149, 165, 166, 0.35)';
    ctx.lineWidth = 1;
    for (let x = gridMinX; x <= gridMaxX; x++) {
        ctx.beginPath();
        ctx.moveTo(mapX(x), 0);
        ctx.lineTo(mapX(x), canvas.height);
        ctx.stroke();
    }
    for (let y = gridMinY; y <= gridMaxY; y++) {
        ctx.beginPath();
        ctx.moveTo(0, mapY(y));
        ctx.lineTo(canvas.width, mapY(y));
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(44, 62, 80, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mapX(0), 0);
    ctx.lineTo(mapX(0), canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, mapY(0));
    ctx.lineTo(canvas.width, mapY(0));
    ctx.stroke();

    ctx.fillStyle = 'rgba(44, 62, 80, 0.75)';
    ctx.font = '10px Arial';
    for (let x = gridMinX; x <= gridMaxX; x++) {
        if (x === 0) continue;
        ctx.fillText(String(x), mapX(x) + 2, mapY(0) - 4);
    }
    for (let y = gridMinY; y <= gridMaxY; y++) {
        if (y === 0) continue;
        ctx.fillText(String(y), mapX(0) + 4, mapY(y) - 2);
    }
    ctx.fillText('0', mapX(0) + 4, mapY(0) - 4);

    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    edges.forEach(edge => {
        if (edge.type === 'segment') {
            ctx.beginPath();
            ctx.moveTo(mapX(edge.v1.x), mapY(edge.v1.y));
            ctx.lineTo(mapX(edge.v2.x), mapY(edge.v2.y));
            ctx.stroke();
        } else if (edge.type === 'ray') {
            ctx.beginPath();
            ctx.moveTo(mapX(edge.v1.x), mapY(edge.v1.y));
            const endX = edge.v1.x + edge.dx * 100;
            const endY = edge.v1.y + edge.dy * 100;
            ctx.lineTo(mapX(endX), mapY(endY));
            ctx.stroke();
        }
    });

    ctx.fillStyle = '#e74c3c';
    vertices.forEach(v => {
        ctx.beginPath();
        ctx.arc(mapX(v.x), mapY(v.y), 4, 0, 2 * Math.PI);
        ctx.fill();
    });

    ctx.font = '16px Arial';
    points.forEach(p => {
        const px = mapX(p.x);
        const py = mapY(p.y);

        // Etykieta jak nazwy trapezów w zadaniu 2 (halo + czarny tekst)
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.fillStyle = '#000';
        ctx.strokeText(p.label, px + 8, py - 8);
        ctx.fillText(p.label, px + 8, py - 8);

        // Marker punktu neutralny jak w zadaniu 2
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#95a5a6';
        ctx.stroke();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(processVoronoi, 200);
});
