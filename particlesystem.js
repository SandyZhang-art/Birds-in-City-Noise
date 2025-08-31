let flowField;
let resolution = 20;
let cols, rows;
let zoff = 0;


function initParticle()
{
    cols = floor(width / resolution);
    rows = floor(height / resolution);
    flowField = new Array(cols * rows);
}

function updateParticle()
{
    updateFlowField();

    particlesLayer.clear();
    for (const obj of clickableObjects)
    {
        if (!obj.isShattered) continue;

        obj.particleSystem.update();
        obj.particleSystem.display(obj.config.particleColor);
    }
}


class ParticleSystem 
{
    constructor(attractorPosition) 
    {
        this.attractor = attractorPosition;
        this.particles = [];
        this.hue = random(360);

        let numParticles = random(20, 30);
        for (let i = 0; i < numParticles; i++) 
        {
            this.particles.push(new Particle(this.hue, this.attractor));
        }
    }

    update() 
    {
        for (let particle of this.particles) 
        {
            let flow = getFlowVector(particle.pos);
            particle.applyForce(flow);
            particle.attract(this.attractor);
            particle.update();
            particle.edges();
        }
    }

    display(color)
    {
        for (let particle of this.particles) 
        {
            particle.display(particlesLayer, color);
        }
    }

}

class Particle 
{
    constructor(parentHue, centerPos) 
    {
        this.pos = createVector(centerPos.x + random(-200, 200), centerPos.y + random(-200, 200));
        this.vel = p5.Vector.random2D();
        this.vel.setMag(random(2, 5));
        this.acc = createVector(0, 0);
        this.maxSpeed = random(2, 20);
        this.hue = parentHue + random(-100, 100);
        this.hue = (this.hue + 360) % 360;
        this.sat = random(80, 100);
        this.bright = random(80, 100);

        this.history = [];
        this.maxHistory = floor(random(5, 10));
    }

    applyForce(force) 
    {
        if (force) 
        {
            this.acc.add(force);
        }
    }
    
    attract(target) 
    {
        let force = p5.Vector.sub(target, this.pos);
        let range = force.mag();
        range = constrain(range, 30, 30);
        let strength = 150 / (range * range); 
        force.setMag(strength);
        this.applyForce(force);
    }

    update()
    {
        this.history.push(this.pos.copy());

        if (this.history.length > this.maxHistory) {
            this.history.splice(0, 1);
        }
        
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }

    
    display(layer, color)
    {
        layer.beginShape();
        layer.noFill();
        layer.strokeWeight(1);
        //layer.stroke(color);
        layer.stroke(this.hue, this.sat, this.bright);
        
        for (let i = 0; i < this.history.length; i++) {
            let p = this.history[i];
            layer.vertex(p.x, p.y);
        }
        layer.endShape();

        layer.noStroke();
        layer.fill(this.hue, this.sat, this.bright);
        layer.circle(this.pos.x, this.pos.y, 6);
    }


    edges()
    {
        if (this.pos.x > width)
        {
            this.pos.x = 0;
        }
        if (this.pos.x < 0)
        {
            this.pos.x = width;
        }
        if (this.pos.y > height)
        {
            this.pos.y = 0;
        }
        if (this.pos.y < 0)
        {
            this.pos.y = height;
        }
    }
}


function updateFlowField()
{
    let xoff = 0;
    for (let i = 0; i < cols; i++) 
    {
        let yoff = 0;
        for (let j = 0; j < rows; j++) 
        {
            let angle = noise(xoff, yoff, zoff) * TWO_PI * 4;
            let v = p5.Vector.fromAngle(angle);
            v.setMag(0.2);
            let index = i + j * cols;
            flowField[index] = v;
            yoff += 0.1;
        }
        xoff += 0.1;
    }
    zoff += 0.005;
}

function getFlowVector(position) 
{
    let x = floor(position.x / resolution);
    let y = floor(position.y / resolution);
    let index = x + y * cols;
    return flowField[index];
}