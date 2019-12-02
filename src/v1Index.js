/**
 * Created by SF3298 on 2018/12/11.
 */
var EarthInitializeV5 = function () {
    "use strict";

    var thm = this;
    var is_Init = false, df_raf;
    var df_Clock, df_Width = 0, df_Height = 0;
    var ray_arr = [];
    var raycaster = null;
    var mouse = null;
    var df_Config = {
        isEarth: true,
        isLineParticle: true,
        background: { color: '#000', opacity: 0 },
        camera: { fov: 45, near: 100, far: 10000, position: [0, 0, 500] },
        light: {
            Ambient: { color: '#FFFFFF', strength: 1.0 }, isHemisphere: false,
            hemisphere: { color: '#EFEFEF', groundColor: '#EFEFEF', strength: 0.7, position: [0, 0, 2000] }
        },
        controls: {
            enabled: true, mouseDownPrevent: false, enablePan: false, panSpeed: 5.0,
            enableZoom: false, zoomSpeed: 0.5, enableRotate: false, rotateSpeed: 0.5,
            distance: [60, 2400], polarAngle: [-Math.PI, 2 * Math.PI], azimuthAngle: [-Math.PI, Math.PI]
        },
        texture: {
        },
        earth: {
            rotateSpeed: 0.01
        },
        lineParticle: {
            size: 10,
            width: 10,
            speed: 0.25,
            moveHeight: 200,//移动距离
            random: [
                { minX: -350, maxX: 350, minZ: -300, maxZ: 100, count: 20, minH: 60, maxH: 120, sY: -100 }
            ],
            colors: [0x175ce5, 0xffab21]
        }
    };

    var txues = {};

    this.init = function (cts, config) {
        var conts = parseCts(cts);
        if (detector() && conts != null) {
            try {
                var config = config || {};
                df_Config = $.extend(true, {}, df_Config, config);
                thm.parentCont = conts;
                thm.GId += THREE.Math.generateUUID();
                var TId = conts.attr('id') + '_' + thm.GId;
                thm.container = creatContainer(TId);
                thm.parentCont.html(thm.container);

                _OrbitControls();//控制器
                //-
                loadTexture();

                initiate();
                raycaster = new THREE.Raycaster();
                mouse = new THREE.Vector2();
                is_Init = true;
            } catch (e) {
                console.log(e);
                thm.Result = 'error! Initialization Error!';
                creatError(conts);
                return;
            }
        } else thm.Result = 'error! Not Support WebGL!';
    };
    /**
     * [transCoord 三维世界坐标转屏幕二维坐标]
     * @Author   ZHOUPU
     * @DateTime 2018-08-02
     * @param    {[object]}   position [三维世界坐标- vector3]
     * @return   {[object]}            [屏幕二维坐标，位置基于容器]
     */
    this.transCoord = function (position) {

        var halfW = df_Width * .5,
            halfH = df_Height * .5,
            vec3 = position.clone().applyMatrix4(thm.scene.matrix).project(thm.camera),
            mx = Math.round(vec3.x * halfW + halfW),
            my = Math.round(-vec3.y * halfH + halfH);
        return new THREE.Vector2(mx, my);
    };

    //-
    this.render = function () {
        if (is_Init) {
            renderers();
        }
    };
    //-
    this.disposeRender = function () {
        if (is_Init) {
            is_Init = false;
        }
    };

    function initiate() {

        df_Clock = new THREE.Clock();
        thm.scene = new THREE.Scene();

        var wh = getWH(); df_Width = wh.w; df_Height = wh.h;
        var cm = df_Config.camera, bg = df_Config.background;
        thm.camera = new THREE.PerspectiveCamera(cm.fov, df_Width / df_Height, cm.near, cm.far);
        thm.camera.position.set(cm.position[0], cm.position[1], cm.position[2]);

        thm.controls = new THREE.OrbitControls(thm.camera, thm.container[0]);
        setControls(thm.controls, df_Config.controls);
        thm.controls.target.set(cm.target[0], cm.target[1], cm.target[2]);
        thm.controls.update();
        thm.scene.position.y -= 70
        //-
        setLight(thm.scene, df_Config.light);

        thm.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        thm.renderer.setSize(df_Width, df_Height);
        thm.renderer.setClearColor(bg.color, bg.opacity);

        thm.container.append($(thm.renderer.domElement));

        //-
        init3DMesh();

        //- 添加监听事件
        window.addEventListener('resize', onWindowResize, false);
    }


    var _Materials = {
        basic: function (param) { return new THREE.MeshBasicMaterial(param); },
        phong: function (param) { return new THREE.MeshPhongMaterial(param); },
        sprite: function (param) { return new THREE.SpriteMaterial(param); },
        shader: function (param) { return new THREE.ShaderMaterial(param); },
        line: function (param) { return new THREE.LineBasicMaterial(param); },
        lineD: function (param) { return new THREE.LineDashedMaterial(param); },
    };

    var _Geometries = {
        geo: function () { return new THREE.Geometry(); },
        sphere: function (r, ws, hs) { return new THREE.SphereGeometry(r, ws, hs); },
        plane: function (w, h, ws, hs) { return new THREE.PlaneGeometry(w, h, ws, hs); },
        planeBuf: function (w, h) { return new THREE.PlaneBufferGeometry(w, h); },
        circleBuf: function (r, s, ts) { return new THREE.CircleBufferGeometry(r, s, ts); },
        buf: function () { return new THREE.BufferGeometry(); }
    };
    function init3DMesh() {
        initContent()
    }
    this.flyShader = {
        vertexshader: `
        varying vec2 vUv;
        varying float u_opacity;
        uniform sampler2D texture;
        uniform float time;
        uniform float vsize;
        uniform float vheight;
        void main() { 
            vUv = vec2(uv.x,uv.y - time);
            float op = (position.y + vheight / 2.0) / vheight;   
            u_opacity = sin( op * 3.1415);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = vsize * 300.0 / (-mvPosition.z);
        }`,
        fragmentshader: `
            varying vec2 vUv;
            varying float u_opacity;
            uniform sampler2D texture;
            uniform vec3 vcolor; 
            void main() {
                gl_FragColor = vec4(vcolor,u_opacity)*texture2D( texture, vUv );
            }
        `
    }
    this.planeUp = [];
    var arrp = [];
    function random() {
        return THREE.Math.randFloat(-150, 150);
    }
    function ran() {
        return THREE.Math.randInt(0, 9);
    }
    function initContent() {
        // 生成内容
        var w = 16, h = 64;
        var texturNumber = 4; // 切换数量
        for (var i = 0; i < texturNumber; i++) {
            var t = createCanvas(w, h, `${ran()}${ran()}${ran()}${ran()}${ran()}${ran()}`, 4); // 展示的字体
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            arrp.push(t)
        }
        for (let index = 0; index < 40; index++) {
            // 坐标
            var p = addUpPlane(w, h, arrp[0], new THREE.Vector3(random(), random(), random()));
            thm.scene.add(p);
            thm.planeUp.push(p);
        }

    }
    /**
     * [addUpPlane 创建mesh]
     *
     * @param   {[type]}  width     [width 宽度]
     * @param   {[type]}  height    [height 高度]
     * @param   {[type]}  textur    [textur 纹理]
     * @param   {[type]}  position  [position 位置]
     *
     * @return  {[type]}            [return mesh]
     */
    function addUpPlane(width, height, textur, position) {
        textur.repeat.x = 1;
        textur.repeat.y = 1;
        var planeGeometry = new THREE.PlaneBufferGeometry(width, height, 1, 32);
        var material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },// time
                texture: { value: textur }, // 图片
                vsize: { value: 400 }, // 大小
                vcolor: { value: new THREE.Color(0.0, 1.0, 1.0) }, // 颜色
                vheight: { value: height }
            },
            transparent: true,
            depthTest: false,
            fragmentShader: thm.flyShader.fragmentshader,
            vertexShader: thm.flyShader.vertexshader
        })
        var plane_up = new THREE.Mesh(planeGeometry, material);
        plane_up.rotation.x -= Math.PI / 2;
        plane_up.position.copy(position);
        return plane_up;
    }
    /**
     * [createCanvas 创建纹理]
     *
     * @param   {[type]}  w     [w 宽度]
     * @param   {[type]}  h     [h 高度]
     * @param   {[type]}  text  [text 字体]
     * @param   {[type]}  dpi   [dpi 越高纹理越清晰]
     *
     * @return  {[type]}        [return 纹理]
     */
    function createCanvas(w, h, text, dpi) {
        //数字展示动效 
        dpi = dpi || 4;
        text = String(text);
        var width = w * dpi;
        var height = h * dpi;
        let canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgba(0,0,0,0)";
        var size = width / 2;
        ctx.font = size + "px 微软雅黑"//和css中的font一样，不过没有了行高
        ctx.textAlign = 'left'//和css中的text-align一样
        ctx.textBaseline = 'left'//这个是文本基线的意思
        ctx.fillStyle = '#ffffff';//你的字体颜色  
        for (let i = 0; i < text.length; i++) {
            // ctx.translate();    
            ctx.fillText(text[i], (width - size) / 2, i * (height / (text.length - 1)));
        }
        var textur = new THREE.Texture(canvas);
        textur.needsUpdate = true;
        return textur;
    }

    //-
    function loadTexture() {
        var txueLoader = new THREE.TextureLoader();
        var _n = df_Config.texture;
        for (var k in _n) {
            txues['_' + k] = txueLoader.load(_n[k], function (tex) {
                tex.anisotropy = 10;
                tex.minFilter = tex.magFilter = THREE.LinearFilter;
            });
        }
    }


    function setLight(scene, opts) {
        scene.add(new THREE.AmbientLight(opts.Ambient.color, opts.Ambient.strength));
        if (opts.isHemisphere) {
            var lh = opts.hemisphere,
                hLight = new THREE.HemisphereLight(lh.color, lh.groundColor, lh.strength);
            hLight.position.set(lh.position[0], lh.position[2], lh.position[1]);
            scene.add(hLight);
        }
    }

    var num = 0;
    var _index = 0;
    function animation(dt) {
        //-
        if (thm._Fly) {
            thm._Fly.animation(dt);
        }
        arrp.forEach(function (e) {
            e.offset.y -= dt / 4;
            e.offset.y -= dt / 4;
        })
        num += dt;
        thm.planeUp.forEach(function (elem) {
            if (elem.material) {
                elem.material.uniforms.time.value += dt / 5;
            }
        })
        if (num > 0.2 && arrp.length > 1) {
            num -= 0.2;
            _index++;
            thm.planeUp.forEach(function (elem) {
                if (elem.material) {
                    elem.material.uniforms.texture.value = arrp[_index % arrp.length]
                    elem.material.needsUpdate = true;
                }
            }) 
        }

    }

    function renderers() {
        (function Animations() {
            if (is_Init) {
                df_raf = window.requestAnimationFrame(Animations);
                var delta = df_Clock.getDelta();
                if (delta > 0) animation(delta);

                thm.renderer.render(thm.scene, thm.camera);
            } else {
                df_raf && window.cancelAnimationFrame(df_raf);
                //-
                removeEvents();

                thm.controls.dispose();
                thm.renderer.dispose();
                thm.renderer.forceContextLoss();
                // thm.renderer.domElement.removeEventListener("mouseup", mouseUp);
                // thm.renderer.domElement = null;
                disposeScene();
            }
        })();
    }

    function onWindowResize() {
        var wh = getWH();
        df_Width = wh.w; df_Height = wh.h;

        thm.camera.aspect = wh.w / wh.h;
        thm.renderer.setSize(wh.w, wh.h);
        thm.camera.updateProjectionMatrix();

        thm.renderer.setSize(df_Width, df_Height);
    }

    function setControls(controls, opts) {

        controls.enabled = opts.enabled;

        controls.zoomSpeed = opts.zoomSpeed;
        controls.enablePan = opts.enablePan;
        controls.enableKeys = opts.enablePan;
        controls.keyPanSpeed = opts.panSpeed;
        controls.enableZoom = opts.enableZoom;
        controls.rotateSpeed = opts.rotateSpeed;
        controls.enableRotate = opts.enableRotate;

        controls.minDistance = opts.distance[0];
        controls.maxDistance = opts.distance[1];
        controls.minPolarAngle = opts.polarAngle[0];
        controls.maxPolarAngle = opts.polarAngle[1];
        controls.minAzimuthAngle = opts.azimuthAngle[0];
        controls.maxAzimuthAngle = opts.azimuthAngle[1];
        controls.mouseDownPrevent = opts.mouseDownPrevent;
    }

    //-
    function disposeScene() {
        //-
        df_raf = null;
        df_Config = null;

        _Shaders = null;
        _Materials = null;
        _Geometries = null;

        //-
        df_Clock = null;

        //-
        thm.earth = thm.diverPoint = null;

        //- 删除纹理对象
        for (var key in txues) {

            txues[key].dispose();
            txues[key] = null;
        }
        txues = null;

        disposeObj(thm.scene);

        thm.scene = thm.camera = thm.controls = null;
        thm.renderer = null;
        if (thm.container) {
            thm.container.remove();
        }
        thm = null;
        renderers = null;

    }
    //-
    function removeEvents() {

        window.removeEventListener('resize', onWindowResize, false);
    }

    //-
    function disposeObj(obj) {
        if (obj instanceof THREE.Object3D) {

            objectTraverse(obj, function (child) {
                //- geometry
                if (child.geometry) {
                    if (child.geometry._bufferGeometry) {
                        child.geometry._bufferGeometry.dispose();
                    }
                    child.geometry.dispose();
                    child.geometry = null;
                    //- material
                    if (Array.isArray(child.material)) {
                        child.material.forEach(function (mtl) {
                            disposeMaterial(mtl);
                        });
                    } else {
                        disposeMaterial(child.material);
                    }
                    child.material = null;
                }
                if (child.parent) child.parent.remove(child);
                child = null;
            });
        }
    }
    //-
    function objectTraverse(obj, callback) {
        if (!callback) return;
        var children = obj.children;
        for (var i = children.length - 1; i >= 0; i--) {
            objectTraverse(children[i], callback);
        }
        callback(obj);
    }
    //-
    function disposeMaterial(mtl) {

        if (mtl.uniforms) {
            for (var i in mtl.uniforms) {
                var uniform = mtl.__webglShader ? mtl.__webglShader.uniforms[i] : undefined;
                if (uniform && uniform.value) {
                    uniform.value.dispose && uniform.value.dispose();
                    uniform.value = null;
                }
                uniform = mtl.uniforms[i];
                if (uniform.value) {

                    uniform.value.dispose && uniform.value.dispose();
                    uniform.value = null;
                }
            }
        }
        if (mtl.map) {
            mtl.map.dispose();
            mtl.map = null;
            if (mtl.__webglShader) {
                mtl.__webglShader.uniforms.map.value.dispose();
                mtl.__webglShader.uniforms.map.value = null;
            }
        }
        mtl.dispose();
        mtl = null;
    }

    function toFunction(a) {
        var b = Object.prototype.toString.call(a) === '[object Function]';
        return b ? a : function (o) { };
    }

    function getWH() {
        return { w: thm.container.width(), h: thm.container.height() };
    }

    function detector() {
        try {
            return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl');
        } catch (e) { return false; }
    }

    function parseCts(cts) {
        var $dom = (typeof cts == 'object') ? $(cts) : $('#' + cts);
        if ($dom.length <= 0) return null;
        return $dom;
    }

    function creatContainer(id) {
        var containers = $('<div></div>');
        containers.css("cssText", "height:100%;width:100%;position:relative !important");
        containers.attr('id', id);
        return containers;
    }

    function creatError(conts, errorText) {
        var error = $('<div class="data-error"></div>'),
            error_text = errorText || '数据错误。。。';
        if (undefined != conts) {
            var ctxt = "color:#fff;position:absolute;top:49%;width:100%;text-align:center;";
            error.css("cssText", ctxt);
            conts.html(error.html(error_text));
        }
    }

};

var _OrbitControls = function () {

    THREE.OrbitControls = function (object, domElement) {
        this.object = object; this.domElement = (domElement !== undefined) ? domElement : document; this.enabled = true; this.target = new THREE.Vector3(); this.minDistance = 0; this.maxDistance = Infinity; this.minZoom = 0; this.maxZoom = Infinity; this.minPolarAngle = 0; this.maxPolarAngle = Math.PI; this.minAzimuthAngle = -Infinity; this.maxAzimuthAngle = Infinity; this.enableDamping = false; this.dampingFactor = 0.25; this.enableZoom = true; this.zoomSpeed = 1; this.enableRotate = true; this.rotateSpeed = 1; this.enablePan = true; this.panSpeed = 1; this.autoRotate = false; this.autoRotateSpeed = 2; this.enableKeys = true; this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 }; this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT }; this.target0 = this.target.clone(); this.position0 = this.object.position.clone(); this.zoom0 = this.object.zoom; this.getPolarAngle = function () { return spherical.phi }; this.getAzimuthalAngle = function () { return spherical.theta }; this.reset = function () { scope.target.copy(scope.target0); scope.object.position.copy(scope.position0); scope.object.zoom = scope.zoom0; scope.object.updateProjectionMatrix(); scope.update(); state = STATE.NONE }; this.update = function () {
            var offset = new THREE.Vector3(); var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0)); var quatInverse = quat.clone().inverse(); var lastPosition = new THREE.Vector3(); var lastQuaternion = new THREE.Quaternion(); return function update() {
                var position = scope.object.position; offset.copy(position).sub(scope.target); offset.applyQuaternion(quat); spherical.setFromVector3(offset); if (scope.autoRotate && state === STATE.NONE) { rotateLeft(getAutoRotationAngle()) } spherical.theta += sphericalDelta.theta; spherical.phi += sphericalDelta.phi; spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta)); spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi)); spherical.makeSafe(); spherical.radius *= scale; spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));
                scope.target.add(panOffset); offset.setFromSpherical(spherical); offset.applyQuaternion(quatInverse); position.copy(scope.target).add(offset); scope.object.lookAt(scope.target); if (scope.enableDamping === true) { scale += (1 - scale) * scope.dampingFactor * 0.6; sphericalDelta.theta *= (1 - scope.dampingFactor); sphericalDelta.phi *= (1 - scope.dampingFactor); panOffset.multiplyScalar((1 - scope.dampingFactor)) } else { scale = 1; sphericalDelta.set(0, 0, 0); panOffset.set(0, 0, 0) } if (zoomChanged || lastPosition.distanceToSquared(scope.object.position) > EPS || 8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) { lastPosition.copy(scope.object.position); lastQuaternion.copy(scope.object.quaternion); zoomChanged = false; return true } return false
            }
        }(); this.dispose = function () { scope.domElement.removeEventListener("contextmenu", onContextMenu, false); scope.domElement.removeEventListener("mousedown", onMouseDown, false); scope.domElement.removeEventListener("wheel", onMouseWheel, false); scope.domElement.removeEventListener("touchstart", onTouchStart, false); scope.domElement.removeEventListener("touchend", onTouchEnd, false); scope.domElement.removeEventListener("touchmove", onTouchMove, false); document.removeEventListener("mousemove", onMouseMove, false); document.removeEventListener("mouseup", onMouseUp, false); window.removeEventListener("keydown", onKeyDown, false) }; var scope = this; var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5 }; var state = STATE.NONE; var EPS = 0.000001; var spherical = new THREE.Spherical(); var sphericalDelta = new THREE.Spherical(); var scale = 1; var panOffset = new THREE.Vector3(); var zoomChanged = false; var rotateStart = new THREE.Vector2(); var rotateEnd = new THREE.Vector2(); var rotateDelta = new THREE.Vector2(); var panStart = new THREE.Vector2(); var panEnd = new THREE.Vector2(); var panDelta = new THREE.Vector2(); var dollyStart = new THREE.Vector2(); var dollyEnd = new THREE.Vector2(); var dollyDelta = new THREE.Vector2(); function getAutoRotationAngle() { return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed } function getZoomScale() {
            return Math.pow(0.95, scope.zoomSpeed)
        } function rotateLeft(angle) { sphericalDelta.theta -= angle } function rotateUp(angle) { sphericalDelta.phi -= angle } var panLeft = function () { var v = new THREE.Vector3(); return function panLeft(distance, objectMatrix) { v.setFromMatrixColumn(objectMatrix, 0); v.multiplyScalar(-distance); panOffset.add(v) } }(); var panUp = function () { var v = new THREE.Vector3(); return function panUp(distance, objectMatrix) { v.setFromMatrixColumn(objectMatrix, 1); v.multiplyScalar(distance); panOffset.add(v) } }(); var pan = function () { var offset = new THREE.Vector3(); return function pan(deltaX, deltaY) { var element = scope.domElement === document ? scope.domElement.body : scope.domElement; if (scope.object instanceof THREE.PerspectiveCamera) { var position = scope.object.position; offset.copy(position).sub(scope.target); var targetDistance = offset.length(); targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180); panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix); panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix) } else { if (scope.object instanceof THREE.OrthographicCamera) { panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix); panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix) } else { console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."); scope.enablePan = false } } } }(); function dollyIn(dollyScale) { if (scope.object instanceof THREE.PerspectiveCamera) { scale /= dollyScale } else { if (scope.object instanceof THREE.OrthographicCamera) { scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale)); scope.object.updateProjectionMatrix(); zoomChanged = true } else { console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."); scope.enableZoom = false } } } function dollyOut(dollyScale) {
            if (scope.object instanceof THREE.PerspectiveCamera) { scale *= dollyScale } else {
                if (scope.object instanceof THREE.OrthographicCamera) {
                    scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
                    scope.object.updateProjectionMatrix(); zoomChanged = true
                } else { console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."); scope.enableZoom = false }
            }
        } function handleMouseDownRotate(event) { rotateStart.set(event.clientX, event.clientY) } function handleMouseDownDolly(event) { dollyStart.set(event.clientX, event.clientY) } function handleMouseDownPan(event) { panStart.set(event.clientX, event.clientY) } function handleMouseMoveRotate(event) { rotateEnd.set(event.clientX, event.clientY); rotateDelta.subVectors(rotateEnd, rotateStart); var element = scope.domElement === document ? scope.domElement.body : scope.domElement; rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed); rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed); rotateStart.copy(rotateEnd); scope.update() } function handleMouseMoveDolly(event) { dollyEnd.set(event.clientX, event.clientY); dollyDelta.subVectors(dollyEnd, dollyStart); if (dollyDelta.y > 0) { dollyIn(getZoomScale()) } else { if (dollyDelta.y < 0) { dollyOut(getZoomScale()) } } dollyStart.copy(dollyEnd); scope.update() } function handleMouseMovePan(event) { panEnd.set(event.clientX, event.clientY); panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed); pan(panDelta.x, panDelta.y); panStart.copy(panEnd); scope.update() } function handleMouseUp(event) { } function handleMouseWheel(event) { if (event.deltaY < 0) { dollyOut(getZoomScale()) } else { if (event.deltaY > 0) { dollyIn(getZoomScale()) } } scope.update() } function handleKeyDown(event) { switch (event.keyCode) { case scope.keys.UP: pan(0, -scope.panSpeed * 7); scope.update(); break; case scope.keys.BOTTOM: pan(0, scope.panSpeed * 7); scope.update(); break; case scope.keys.LEFT: pan(-scope.panSpeed * 7, 0); scope.update(); break; case scope.keys.RIGHT: pan(scope.panSpeed * 7, 0); scope.update(); break } } function handleTouchStartRotate(event) { rotateStart.set(event.touches[0].pageX, event.touches[0].pageY) } function handleTouchStartDolly(event) {
            var dx = event.touches[0].pageX - event.touches[1].pageX; var dy = event.touches[0].pageY - event.touches[1].pageY;
            var distance = Math.sqrt(dx * dx + dy * dy); dollyStart.set(0, distance)
        } function handleTouchStartPan(event) { panStart.set(event.touches[0].pageX, event.touches[0].pageY) } function handleTouchMoveRotate(event) { rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY); rotateDelta.subVectors(rotateEnd, rotateStart); var element = scope.domElement === document ? scope.domElement.body : scope.domElement; rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed); rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed); rotateStart.copy(rotateEnd); scope.update() } function handleTouchMoveDolly(event) { var dx = event.touches[0].pageX - event.touches[1].pageX; var dy = event.touches[0].pageY - event.touches[1].pageY; var distance = Math.sqrt(dx * dx + dy * dy); dollyEnd.set(0, distance); dollyDelta.subVectors(dollyEnd, dollyStart); if (dollyDelta.y > 0) { dollyOut(getZoomScale()) } else { if (dollyDelta.y < 0) { dollyIn(getZoomScale()) } } dollyStart.copy(dollyEnd); scope.update() } function handleTouchMovePan(event) { panEnd.set(event.touches[0].pageX, event.touches[0].pageY); panDelta.subVectors(panEnd, panStart); pan(panDelta.x, panDelta.y); panStart.copy(panEnd); scope.update() } function handleTouchEnd(event) { } function onMouseDown(event) { if (scope.enabled === false) { return } event.preventDefault(); if (event.button === scope.mouseButtons.ORBIT) { if (scope.enableRotate === false) { return } handleMouseDownRotate(event); state = STATE.ROTATE } else { if (event.button === scope.mouseButtons.ZOOM) { if (scope.enableZoom === false) { return } handleMouseDownDolly(event); state = STATE.DOLLY } else { if (event.button === scope.mouseButtons.PAN) { if (scope.enablePan === false) { return } handleMouseDownPan(event); state = STATE.PAN } } } if (state !== STATE.NONE) { document.addEventListener("mousemove", onMouseMove, false); document.addEventListener("mouseup", onMouseUp, false) } } function onMouseMove(event) {
            if (scope.enabled === false) { return } event.preventDefault(); if (state === STATE.ROTATE) { if (scope.enableRotate === false) { return } handleMouseMoveRotate(event) } else {
                if (state === STATE.DOLLY) {
                    if (scope.enableZoom === false) {
                        return
                    } handleMouseMoveDolly(event)
                } else { if (state === STATE.PAN) { if (scope.enablePan === false) { return } handleMouseMovePan(event) } }
            }
        } function onMouseUp(event) { if (scope.enabled === false) { return } handleMouseUp(event); document.removeEventListener("mousemove", onMouseMove, false); document.removeEventListener("mouseup", onMouseUp, false); state = STATE.NONE } function onMouseWheel(event) { if (scope.enabled === false || scope.enableZoom === false || (state !== STATE.NONE && state !== STATE.ROTATE)) { return } handleMouseWheel(event) } function onKeyDown(event) { if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) { return } handleKeyDown(event) } function onTouchStart(event) { if (scope.enabled === false) { return } switch (event.touches.length) { case 1: if (scope.enableRotate === false) { return } handleTouchStartRotate(event); state = STATE.TOUCH_ROTATE; break; case 2: if (scope.enableZoom === false) { return } handleTouchStartDolly(event); state = STATE.TOUCH_DOLLY; break; case 3: if (scope.enablePan === false) { return } handleTouchStartPan(event); state = STATE.TOUCH_PAN; break; default: state = STATE.NONE } } function onTouchMove(event) { if (scope.enabled === false) { return } event.preventDefault(); event.stopPropagation(); switch (event.touches.length) { case 1: if (scope.enableRotate === false) { return } if (state !== STATE.TOUCH_ROTATE) { return } handleTouchMoveRotate(event); break; case 2: if (scope.enableZoom === false) { return } if (state !== STATE.TOUCH_DOLLY) { return } handleTouchMoveDolly(event); break; case 3: if (scope.enablePan === false) { return } if (state !== STATE.TOUCH_PAN) { return } handleTouchMovePan(event); break; default: state = STATE.NONE } } function onTouchEnd(event) { if (scope.enabled === false) { return } handleTouchEnd(event); state = STATE.NONE } function onContextMenu(event) { event.preventDefault() } scope.domElement.addEventListener("contextmenu", onContextMenu, false); scope.domElement.addEventListener("mousedown", onMouseDown, false); scope.domElement.addEventListener("wheel", onMouseWheel, false); scope.domElement.addEventListener("touchstart", onTouchStart, false);
        scope.domElement.addEventListener("touchend", onTouchEnd, false); scope.domElement.addEventListener("touchmove", onTouchMove, false); window.addEventListener("keydown", onKeyDown, false); this.update()
    }; THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype); THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

};


