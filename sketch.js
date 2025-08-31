
let clickableObjects = [];
let loadedImages = {};
let bgImg;
let bgLayer;
let fragmentsLayer;
let particlesLayer;
let textLayer;
let shakeStrength = 0;
let noiseDB = 30;
let cursor1, cursor2, cursor3;
let curCursor;

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const MIN_NUM_FRAGMENTS = 5;
const MAX_NUM_FRAGMENTS = 10;
const NUM_POINTS_INSIDE = 8000;

let palette = ["#7b4800", "#002185", "#003c32", "#fcd300", "#ff2702", "#6b9404"];
let brush_flowFields_types = ["zigzag", "seabed", "curved", "truncated"];
let brush_hatch_types = ["marker", "marker2"]
let brush_stroke_types = ["2H", "HB", "charcoal"]

let noiseCarPaths = ["assets/noise/vehicles1.mp3", "assets/noise/vehicles2.mp3", "assets/noise/vehicles3.mp3"]
let noiseTrainPaths = ["assets/noise/train.mp3"]
let noiseCrowdPaths = ["assets/noise/crowd1.mp3", "assets/noise/crowd2.mp3", "assets/noise/crowd3.mp3"]
let bgSound;
let curNoiseCount = 0;

function preload()
{
    bgImg = loadImage("assets/images/background.png");
    for (const config of objectConfigs) 
    {
        if (!loadedImages[config.imagePath]) 
        {
            loadedImages[config.imagePath] = loadImage(config.imagePath);
        }
        if (!loadedImages[config.maskPath]) 
        {
            loadedImages[config.maskPath] = loadImage(config.maskPath);
        }
    }
    bgSound = loadSound('assets/birds.mp3');
    cursor1 = loadImage("assets/icons/cursor_1.png");
    cursor2 = loadImage("assets/icons/cursor_2.png");
    cursor3 = loadImage("assets/icons/cursor_3.png");
    curCursor = cursor1;
}

function setup()
{
    createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT, WEBGL);
    textureMode(NORMAL);
    angleMode(DEGREES);

    initParticle();
    for (const config of objectConfigs) 
    {
        let cObj = 
        {
            config: config,
            mainImage: loadedImages[config.imagePath],
            maskImage: loadedImages[config.maskPath],
            isShattered: false,
            fragments: [],
            hatchtype: random(brush_hatch_types),
            hatchColor: random(palette),
            hatchDist: random(2, 10),
            hatchAngle: random(-180, 180),
            flowFieldType: random(brush_flowFields_types),
            flowFieldColor: random(palette),
            bleedStrength: random(0.1, 0.5),
            textureStrength: random(0.5, 1.0),
            borderIntensity: random(0.8, 1.0),
            strokeType: "charcoal",
            strokeColor: random(palette),
            particleSystem: new ParticleSystem(createVector(config.centerPos.x * width, config.centerPos.y * height)),
            sound: null
        }
        clickableObjects.push(cObj);
    }
    bgImg.resize(width, height);
    for (const obj of clickableObjects) 
    {
        obj.mainImage.resize(width, height);
        obj.maskImage.resize(width, height);
    }

    bgLayer = createGraphics(width, height, P2D);
    fragmentsLayer = createGraphics(width, height, WEBGL);
    particlesLayer = createGraphics(width, height, P2D);
    particlesLayer.colorMode(HSB, 360, 100, 100, 100);
    textLayer = createGraphics(width, height, P2D);

    brush.load(fragmentsLayer);

    updateFragmentLayer();

    bgSound.loop();
  
    noCursor();
}

function draw()
{
    background(0);
    
    push();
    let dx = random(-shakeStrength, shakeStrength);
    let dy = random(-shakeStrength, shakeStrength);
    let angle = radians(random(-shakeStrength, shakeStrength) * 0.5);
    translate(dx, dy);
    rotate(angle);
    
    translate(-width / 2, -height / 2);

    updateParticle();
    updateBackground();
    image(bgLayer, 0, 0);

    image(fragmentsLayer, 0, 0);
    image(particlesLayer, 0, 0);
  
    textLayer.clear();
    textLayer.noStroke();
    textLayer.fill(239, 230, 255);
    textLayer.textSize(25);
    textLayer.textAlign(LEFT, TOP);
    textLayer.text("RECENT DB: "+nf(noiseDB, 0, 2), 20, 20);
    image(textLayer, 0, 0);

    detectNoiseHover();
    updateCursor();

    pop();
}

function updateBackground()
{
    let sat = map(curNoiseCount, 0, 10, 255, 0);
    bgLayer.clear();
    bgLayer.image(bgImg, 0, 0);
    bgLayer.filter(GRAY);

    bgLayer.tint(255, sat);
    bgLayer.image(bgImg, 0, 0); 
    bgLayer.noTint();
}

function updateFragmentLayer()
{
    fragmentsLayer.clear();
    fragmentsLayer.noStroke();
    fragmentsLayer.textureMode(NORMAL);
    fragmentsLayer.angleMode(DEGREES);
    
    fragmentsLayer.resetMatrix();
    fragmentsLayer.translate(-width / 2, -height / 2);

    for (const obj of clickableObjects)
    {
        fragmentsLayer.image(obj.mainImage, 0, 0, width, height);
    }
    
    for (const obj of clickableObjects)
    {
        if (!obj.isShattered) continue;
        
        brush.noFill();
        brush.noStroke();
        brush.noField();

        brush.setHatch(obj.hatchtype, obj.hatchColor);
        brush.hatch(obj.hatchDist, obj.hatchAngle);

        let scaledPoints = obj.config.polygonPoints.map(pt => [pt.x * width, pt.y * height]);
        brush.polygon(scaledPoints);

        brush.noStroke();
        brush.noFill();
        brush.noHatch();
    }
    
    for (const obj of clickableObjects)
    {
        if (!obj.isShattered) continue;
        
        for (const frag of obj.fragments) 
        {
            fragmentsLayer.push();
            fragmentsLayer.translate(frag.center.x + frag.offset.x, frag.center.y + frag.offset.y);
            fragmentsLayer.rotate(frag.rotation);
            
            fragmentsLayer.beginShape();
            fragmentsLayer.texture(obj.mainImage);
            for (const p of frag.hull) 
            {
                const relX = p.x - frag.center.x;
                const relY = p.y - frag.center.y;
                const u = p.x / width;
                const v = p.y / height;
                fragmentsLayer.vertex(relX, relY, 0, u, v);
            }
            fragmentsLayer.endShape(CLOSE);
            fragmentsLayer.pop();
        }
    }
    for (const obj of clickableObjects)
    {
        if (!obj.isShattered) continue;
        
        for (const frag of obj.fragments) 
        {
            fragmentsLayer.push();
            fragmentsLayer.translate(frag.center.x + frag.offset.x, frag.center.y + frag.offset.y);

            brush.noHatch();
            brush.set(obj.strokeType, obj.strokeColor);
            
            brush.field(obj.flowFieldType);
            brush.fill(obj.flowFieldColor, 100);
            brush.bleed(obj.bleedStrength);
            brush.fillTexture(obj.textureStrength, obj.borderIntensity);

            const vertexArray = frag.hull.map(v => { return [v.x - frag.center.x, v.y - frag.center.y];});
            brush.polygon(vertexArray);

            fragmentsLayer.pop();
        }
    }
}

function mousePressed() 
{
    let hasMatched = false;
    for (const obj of clickableObjects) 
    {
        const colorAtMouse = obj.maskImage.get(mouseX, mouseY);
        const hexAtMouse = rgbToHex(colorAtMouse[0], colorAtMouse[1], colorAtMouse[2]);

        if (colorAtMouse[3] === 0) continue;

        if (hexAtMouse.toUpperCase() === obj.config.colorValue.toUpperCase())
        {
            hasMatched = true;

            obj.isShattered = !obj.isShattered;
            if (obj.isShattered) 
            {
                let fragNum = round(random(MIN_NUM_FRAGMENTS, MAX_NUM_FRAGMENTS));
                obj.fragments = shatterPolygon(obj.config, fragNum);
            } 
            else
            {
                obj.fragments = [];
                resetBrushStyle(obj);
            }

            toggleNoise(obj);

            break; 
        }
    }

    if(hasMatched)
    {
        updateFragmentLayer();
    }
    
}
function shatterPolygon(config, n)
{
    const newFragments = [];
    const mainPolygon = config.polygonPoints.map(p => createVector(p.x * width, p.y * height));
    const points = generatePointsInPolygon(mainPolygon, NUM_POINTS_INSIDE);
    if (points.length === 0)
    {
        console.error("未能生成任何在多边形内的点");
        return []; 
    }
    const clusters = kmeans(points, n);
    for (const cluster of clusters) 
    {
        if (cluster.points.length < 3) continue;
        const hullVertices = convexHull(cluster.points);
        if (hullVertices.length < 3) continue;
        let centerX = 0, centerY = 0;
        for (const p of hullVertices) 
        {
            centerX += p.x;
            centerY += p.y;
        }
        const center = createVector(centerX / hullVertices.length, centerY / hullVertices.length);
        newFragments.push({
            hull: hullVertices,
            center: center,
            offset: createVector(random(-width / 4, width / 4), random(-height / 4, height / 4)),
            rotation: random(360)
        });
    }
    return newFragments;
}

function resetBrushStyle(clickableObj)
{
    clickableObj.hatchtype = random(brush_hatch_types);           
    clickableObj.hatchColor = random(palette);                   
    clickableObj.hatchDist = random(2, 10);                       
    clickableObj.hatchAngle = random(-180, 180);                 

    clickableObj.flowFieldType = random(brush_flowFields_types); 
    clickableObj.flowFieldColor = random(palette);               
    clickableObj.bleedStrength = random(0.1, 0.5);               
    clickableObj.textureStrength = random(0.5, 1.0);             
    clickableObj.borderIntensity = random(0.8, 1.0);             
    clickableObj.strokeColor = random(palette);                   
}

function toggleNoise(clickableObj)
{
    let name = clickableObj.config.name;
    if(clickableObj.isShattered)
    {
        if (clickableObj.sound && clickableObj.sound.isPlaying()) 
        {
            clickableObj.sound.stop();
        }

        let soundPath;
        if (name.includes("vehicles"))
        {
            soundPath = random(noiseCarPaths);
        } 
        else if (name.includes("train"))
        {
            soundPath = random(noiseTrainPaths);
        } 
        else if (name.includes("crowd"))
        {
            soundPath = random(noiseCrowdPaths);
        }

        if (soundPath)
        {
            clickableObj.sound = loadSound(soundPath, () => 
            {
                clickableObj.sound.loop();
            });
            curNoiseCount ++;
            curNoiseCount = constrain(curNoiseCount, 0, 16);
        }
    }
    else
    {
        if (clickableObj.sound && (clickableObj.sound.isPlaying() || clickableObj.sound.isLooping()))
        {
            clickableObj.sound.stop(0.2); 
            clickableObj.sound = null;
        }
        curNoiseCount--;
        curNoiseCount = constrain(curNoiseCount, 0, 16);
    }

    let bgVolume = map(curNoiseCount, 0, 10, 1, 0);
    bgVolume = constrain(bgVolume, 0, 1);
    bgSound.setVolume(bgVolume);

    shakeStrength = map(curNoiseCount, 0, 16, 0, 10);

    noiseDB = map(curNoiseCount, 0, 16, 30, 150);
    noiseDB += random(-5, 5);
    noiseDB = constrain(noiseDB, 0, 150);
}

function detectNoiseHover()
{
    let hasHover = false;
    let hoverObj;

    for (const obj of clickableObjects) 
    {
        const polygon = obj.config.polygonPoints.map(p => createVector(p.x * width, p.y * height));
        hasHover = isPointInPolygon(createVector(mouseX, mouseY), polygon);
        if(hasHover)
        {
            hoverObj = obj;
            break;
        }
    }
    

    if(hasHover)
    {
        if(hoverObj.isShattered)
        {
            curCursor = cursor3;
        }
        else
        {
            curCursor = cursor2;
        }
    }
    else
    {
        if(curNoiseCount > 0)
        {
            curCursor = cursor3;
        }
        else
        {
            curCursor = cursor1;
        }
    }
}

function updateCursor()
{
    let curW = 100;
    let curH = 75;
    image(curCursor, mouseX - curW*0.5, mouseY - curH*0.5, curW, curH);
}