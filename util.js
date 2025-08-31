
function rgbToHex(r, g, b) 
{
    const toHex = c => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generatePointsInPolygon(polygon, numPoints)
{
    const points = [];
    const bounds = getPolygonBounds(polygon);
    let attempts = 0;
    while (points.length < numPoints && attempts < numPoints * 100)
    {
        const p = createVector(
            random(bounds.minX, bounds.maxX),
            random(bounds.minY, bounds.maxY)
        );
        if (isPointInPolygon(p, polygon)) 
        {
            points.push(p);
        }
        attempts++;
    }
    return points;
}

function kmeans(points, k)
{
    let centroids = [];
    for (let i = 0; i < k; i++) centroids.push(random(points));
    let clusters;
    let changed = true;
    while (changed) 
    {
        changed = false;
        clusters = Array.from({ length: k }, () => ({
            points: [],
            centroid: null,
        }));
        for (const p of points)
        {
            let minDstSq = Infinity;
            let bestIdx = -1;
            for (let i = 0; i < k; i++)
            {
                const dstSq = distSquared(p, centroids[i]);
                if (dstSq < minDstSq)
                {
                    minDstSq = dstSq;
                    bestIdx = i;
                }
            }
            clusters[bestIdx].points.push(p);
        }
        for (let i = 0; i < k; i++)
        {
            if (clusters[i].points.length > 0) 
            {
                let sumX = 0,
                sumY = 0;
                clusters[i].points.forEach((p) => {
                    sumX += p.x;
                    sumY += p.y;
                });
                const newCentroid = createVector(
                    sumX / clusters[i].points.length,
                    sumY / clusters[i].points.length
                );
                if (centroids[i] && !newCentroid.equals(centroids[i])) 
                {
                    changed = true;
                }
                centroids[i] = newCentroid;
                clusters[i].centroid = newCentroid;
            }
        }
    }
    return clusters;
}

function getPolygonBounds(polygon)
{
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const p of polygon) 
    {
        minX = min(minX, p.x);
        minY = min(minY, p.y);
        maxX = max(maxX, p.x);
        maxY = max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
}

function isPointInPolygon(point, polygon)
{
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++)
    {
        const xi = polygon[i].x,
        yi = polygon[i].y;
        const xj = polygon[j].x,
        yj = polygon[j].y;
        const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

function distSquared(p, q)
{
    return sq(p.x - q.x) + sq(p.y - q.y);
}

function convexHull(points)
{
    if (points.length < 3) return points;
    const hull = [];
    let pointOnHull = points.reduce(
        (leftmost, p) => (p.x < leftmost.x ? p : leftmost),
        points[0]
    );
    let i = 0;
    do 
    {
        hull[i] = pointOnHull;
        let endpoint = points[0];
        for (let j = 1; j < points.length; j++) 
        {
            if (
                endpoint === pointOnHull ||
                p5.Vector.sub(points[j], hull[i]).cross(
                p5.Vector.sub(endpoint, hull[i])
                ).z > 0
            )
            {
                endpoint = points[j];
            }
        }
        i++;
        pointOnHull = endpoint;
    } 
    while (pointOnHull !== hull[0]);
    return hull;
}
