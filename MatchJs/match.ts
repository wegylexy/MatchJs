﻿class MatchJs {
    static getShader(gl: WebGLRenderingContext, id: string) {
        let script = document.getElementById(id) as HTMLScriptElement,
            source = "",
            shader = gl.createShader(({
                "x-shader/x-fragment": gl.FRAGMENT_SHADER,
                "x-shader/x-vertex": gl.VERTEX_SHADER
            } as { [type: string]: number })[script.type]);
        for (let n = script.firstChild; n; n = n.nextSibling)
            if (n.nodeType == 3)
                source += n.textContent;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            throw new Error(gl.getShaderInfoLog(shader));
        return shader;
    }

    static linkProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
        let program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            let log = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(log);
        }
        return program;
    }

    context: WebGLRenderingContext;

    protected tSource: WebGLTexture;

    protected vertexBuffer: WebGLBuffer;

    protected u_img: WebGLUniformLocation;

    constructor(public surface: HTMLCanvasElement, public source: ImageData | HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) {
        let gl = this.context = surface.getContext("webgl") || surface.getContext("experimental-webgl"),
            p = MatchJs.linkProgram(gl, MatchJs.getShader(gl, "vs"), MatchJs.getShader(gl, "fs")),
            a_coor = gl.getAttribLocation(p, "a_coor");
        this.u_img = gl.getUniformLocation(p, "u_img");
        gl.useProgram(p);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer = gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1
        ]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(a_coor);
        gl.vertexAttribPointer(a_coor, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        gl.bindTexture(gl.TEXTURE_2D, this.tSource = gl.createTexture());
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.bindTexture(gl.TEXTURE_2D, null);

        addEventListener("resize", () => { this.reset() });
    }

    reset() {
        let canvas = this.surface;
        this.context.viewport(0, 0, canvas.width = canvas.clientWidth, canvas.height = canvas.clientHeight);
        this.draw();
    }

    refreshSource() {
        let gl = this.context;
        gl.bindTexture(gl.TEXTURE_2D, this.tSource);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.source);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.draw();
    }

    draw() {
        let gl = this.context;
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tSource);
        gl.uniform1i(this.u_img, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}

addEventListener("DOMContentLoaded", () => {
    let img = document.getElementById("sample01") as HTMLImageElement;
    img.addEventListener("load", () => {
        let canvas = document.getElementById("c2d") as HTMLCanvasElement,
            context = canvas.getContext("2d"),
            match = new MatchJs(document.getElementById("cWGL") as HTMLCanvasElement, canvas),
            gl = match.context,
            size = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
                2 ** Math.ceil(Math.log(Math.max(img.width, img.height)) / Math.LN2));
        canvas.height = canvas.width = size;
        context.drawImage(img, 0, 0, img.width, img.height, 0, 0, size, size);
        match.refreshSource();
        match.reset();
    });
    img.src = "sample01.jpg";
});