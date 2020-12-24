

class Generator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.canvas.width = 1000;   
        this.canvas.height = 2000;  
        this.context = this.canvas.getContext('2d');

        this.setConfig();

        this.width = 800;
        this.height  = 900;

        this.x = 10;
        this.y = 10;
    }

    drawSheet(structure) {

        this.context.fillStyle = 'white';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.context.fillStyle = 'black';

        this.setLineWidth(5)
        this.drawRect(0, 0, 800, 1000, 10);

        this.setLineWidth(2);
        this.drawInfoRect(30, 30, 100, 40, '姓名');
        this.drawInfoRect(30, 100, 100, 40, '班级');


        this.drawNumbers(2, '科目代号', 300, 30);

        this.drawNumbers(8, '学  号', (width, height) => {
            return {x: this.width - width - 30, y: 30}
        });


        this.drawLine(10, 350, this.width - 10, 350);

        this.drawBubbles(0, 380, structure);
    }

    toImage() {
        // var image = new Image();
        return this.canvas.toDataURL("image/png");
        // return image;
    }

    setConfig(config) {
        this.config = config || {
            scale: 1,
            width: 800,

            bubble: {
                width: 32,
                height: 18,
                radius: 0
            },

            row_label_width: 16,
            row_label_margin: 5,

            bubble_x_gap: 5,
            bubble_y_gap: 5,

            group_x_gap: 30,
            group_y_gap: 40,

            numbers_bubble_y_gap: 4,
        };

        return this;
    }



    drawNumbers(digits=10, title='号码', x, y) {

        const padding = 4;
        const colWidth = (this.config.bubble.width + 2 * padding);
        const titleHeight = 20;
        const width = colWidth * digits
        const height = this.config.bubble.height * 10 + this.config.numbers_bubble_y_gap * 11 + colWidth + titleHeight

        if (typeof x === 'function') {
            const pos = x(width, height);
            x = pos.x;
            y = pos.y;
        }

        const bubblesY = y + colWidth + titleHeight

        this.drawRect(x, y, width, height, 4);


        this.drawLine(x, y + titleHeight, x + width, y + titleHeight);
        this.drawLine(x, bubblesY, x + width, bubblesY);

        for (let i = 0; i < digits; i++) {
            this.drawLine(x + colWidth * i, y + titleHeight, x + colWidth * i, y + height);
        }

        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        this.drawText(title, x + width / 2, y + titleHeight / 2);


        for (let i = 0; i < digits; i++) {
            const colx = x + colWidth * i;
            for (let j = 0; j < 10; j++) {
                
                const by = bubblesY + (this.config.bubble.height + this.config.numbers_bubble_y_gap ) * j + this.config.numbers_bubble_y_gap

                this.drawBubble(colx + padding, by, j);
            }
        }


    }


    drawBubbles(x, y, bubbles) {
        let lastRegionMaxY = y;

        for (let i = 0; i < bubbles.length; i++) {
            const region = bubbles[i];

            const [rx, ry, rmx, rmy] = this.drawBubbleRegion(x, lastRegionMaxY + this.config.group_y_gap, bubbles[i]);

            lastRegionMaxY = rmy;
        }
    }


    drawBubbleRegion(x, y, regionBubbles) {
        let lastGroupMaxX = x;

        let maxY = 0;
        let maxX = 0;

        for (let i = 0; i < regionBubbles.length; i++) {
            const group = regionBubbles[i];
            // y = y + i * 30
        
            const [gx, gy, gmx, gmy] = generator.drawBubbleGroup(lastGroupMaxX + this.config.group_x_gap, y, group);
            lastGroupMaxX = gmx;

            maxX = Math.max(maxX, gmy)
            maxY = Math.max(maxY, gmy)
        }

        return [x, y, maxX, maxY];
    }

    drawBubbleGroup(x, y, bubbles) {
        let maxY = y + bubbles.length * this.config.bubble.height + this.config.bubble_y_gap * (bubbles.length - 1);

        let maxBubblesPerRow = 0;
        for (let row of bubbles) {
            maxBubblesPerRow = Math.max(maxBubblesPerRow, row.bubbles.length)
        }

        console.log(maxBubblesPerRow)

        let maxX = x + maxBubblesPerRow * this.config.bubble.width + this.config.bubble_x_gap * (maxBubblesPerRow - 1) + this.config.row_label_width + this.config.row_label_margin;


        for (let i = 0; i < bubbles.length; i++) {
            const row = bubbles[i]

            const ry = y + i * this.config.bubble.height + i * this.config.bubble_y_gap
            this.drawBubbleRow(x, ry, row.label, row.bubbles);
        }



        return [x, y, maxX, maxY];
    }

    drawBubbleRow(x, y, label, bubbles) {

        this.context.textAlign = 'right';
        this.context.textBaseline = 'middle';
        this.drawText(label, x + this.config.row_label_width, y + this.config.bubble.height / 2);

        for (let j = 0; j < bubbles.length; j++) {
            generator.drawBubble(x + this.config.row_label_width + this.config.row_label_margin + j * this.config.bubble.width + this.config.bubble_x_gap * j, y, bubbles[j]);
        }
    }

    drawBubble(x, y, label) {
        this.drawRect(x, y, this.config.bubble.width, this.config.bubble.height, 3);

        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        x = x + this.config.bubble.width /2 
        y = y + this.config.bubble.height / 2 

        this.drawText(label, x, y);
    }


    drawInfoRect(x, y, width, height, text) {
        this.drawRect(x, y, width, height);

        const titleWidth = 20;

        const tH = 15;
        const tW = 10;

        const textStartY = y + (height - (tH * text.length) ) /2 

        this.context.textAlign = 'center';
        this.context.textBaseline = 'top';

        for (let i = 0; i < text.length;i++) {
            this.drawText(text[i], x + titleWidth / 2, textStartY + tH * i);
        }

        this.drawLine(x+ titleWidth, y, x+ titleWidth, y + height);
    }


    setLineWidth(width) {
        this.context.lineWidth = width;
    }

    drawRect(x, y, width, height, radius=0){  
        const ctx = this.context;

        const p = this.transformPos(x, y)
        x = p.x;
        y = p.y;

        ctx.beginPath();   
        ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 3 / 2);   
        ctx.lineTo(width - radius + x, y);   
        ctx.arc(width - radius + x, radius + y, radius, Math.PI * 3 / 2, Math.PI * 2);   
        ctx.lineTo(width + x, height + y - radius);   
        ctx.arc(width - radius + x, height - radius + y, radius, 0, Math.PI * 1 / 2);   
        ctx.lineTo(radius + x, height +y);   
        ctx.arc(radius + x, height - radius + y, radius, Math.PI * 1 / 2, Math.PI);   
        ctx.closePath();

        ctx.stroke(); 
    }

    drawLine(x, y, x2, y2, width) {
        const p = this.transformPos(x, y)
        x = p.x;
        y = p.y;

        const p2 = this.transformPos(x2, y2)
        x2 = p2.x;
        y2 = p2.y;

        this.context.beginPath();
        this.context.moveTo(x, y);
        this.context.lineTo(x2, y2);
        // this.context.lineWidth = width;
        this.context.stroke();
    }

    drawText(txt, x, y) {
        const p = this.transformPos(x, y)
        x = p.x;
        y = p.y;

        this.context.fillText(txt+'', x, y);
    }

    transformPos(x, y) {
        return {
            x: this.x + x,
            y: this.y + y
        }
    }

}

const generator = new Generator('canvas');

const structure = [[
    [
        { label: 1, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 2, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 3, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 4, bubbles: ['A', 'D'] },
        { label: 5, bubbles: ['A', 'B', 'C', 'D'] }
    ],
    [
        { label: 6, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 7, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 8, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 9, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 10, bubbles: ['A', 'B', 'C', 'D'] },
    ],
    [
        { label: 11, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 12, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 13, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 14, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 15, bubbles: ['A', 'B', 'C', 'D'] },
    ],
    [
        { label: 11, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 12, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 13, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 14, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 15, bubbles: ['A', 'B', 'C', 'D'] },
    ]
], [
    [
        { label: 16, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 17, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 18, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 19, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 20, bubbles: ['A', 'B', 'C', 'D'] },
    ],
    [
        { label: 16, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 17, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 18, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 19, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 20, bubbles: ['A', 'B', 'C', 'D'] },
    ],
    [
        { label: 16, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 17, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 18, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 19, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 20, bubbles: ['A', 'B', 'C', 'D'] },
    ],
], [
    [
        { label: 16, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 17, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 18, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 19, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 20, bubbles: ['A', 'B', 'C', 'D'] },
    ],
    [
        { label: 16, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 17, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 18, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 19, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 20, bubbles: ['A', 'B', 'C', 'D'] },
    ],
    [
        { label: 16, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 17, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 18, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 19, bubbles: ['A', 'B', 'C', 'D'] },
        { label: 20, bubbles: ['A', 'B', 'C', 'D'] },
    ],
]]

generator.drawSheet(structure);
// 

const image = generator.toImage();

let a = document.createElement('a');     // 创建一个a节点插入的document
a.download = '图片名字'  // 设置a节点的download属性值
a.href = image ;         // 将图片的src赋值给a节点的href
a.click()