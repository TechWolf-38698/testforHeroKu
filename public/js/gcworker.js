! function (e, t) {
    if ("object" == typeof exports && "object" == typeof module) module.exports = t();
    else if ("function" == typeof define && define.amd) define([], t);
    else {
        var r = t();
        for (var n in r)("object" == typeof exports ? exports : e)[n] = r[n]
    }
}(this, function () {
    return function (e) {
        function t(n) {
            if (r[n]) return r[n].exports;
            var o = r[n] = {
                i: n,
                l: !1,
                exports: {}
            };
            return e[n].call(o.exports, o, o.exports, t), o.l = !0, o.exports
        }
        var r = {};
        return t.m = e, t.c = r, t.d = function (e, r, n) {
            t.o(e, r) || Object.defineProperty(e, r, {
                configurable: !1,
                enumerable: !0,
                get: n
            })
        }, t.n = function (e) {
            var r = e && e.__esModule ? function () {
                return e.default
            } : function () {
                return e
            };
            return t.d(r, "a", r), r
        }, t.o = function (e, t) {
            return Object.prototype.hasOwnProperty.call(e, t)
        }, t.p = "", t(t.s = 0)
    }([function (e, t, r) {
        "use strict";

        function n() {
            return "object" == typeof WebAssembly && "function" == typeof WebAssembly.Memory && !0
        }

        function o() {
            return n() ? c + "/libGCPluginWasm.js" : c + "/libGCPlugin.js"
        }

        function s() {
            f || (f = !0, importScripts(o()), t.Module = a = Module(l), u.removeEventListener("message", i))
        }

        function i(e) {
            var t = e.data;
            t && (console.log("Message received:", t), t.url ? (l._setPathPrefix(t.url.trim()), s()) : "init" == t.fn && setTimeout(s, 25))
        }
        Object.defineProperty(t, "__esModule", {
            value: !0
        });
        var a, u = self,
            c = "https://downloads.gradecam.com/noplugin/wasm",
            l = {
                onRuntimeInitialized: function () {
                    setTimeout(function () {
                        return r(1)
                    }, 0)
                },
                _setPathPrefix: function (e) {
                    "/" == e.charAt(e.length - 1) && (e = e.substr(0, e.length - 1)), c = e
                },
                locateFile: function (e) {
                    return c + "/" + e
                }
            };
        t.Module = a;
        var f = !1;
        u.addEventListener("message", i)
    }, function (e, t, r) {
        "use strict";

        function n(e) {
            return {
                x: e.global_x,
                y: e.global_y
            }
        }

        function o(e, t) {
            return {
                x: t.global_x,
                y: e.global_y
            }
        }

        function s(e) {
            var t = [];
            for (var r in e) {
                var s = e[r];
                s.rect ? t.push({
                    type: "rect",
                    tl: n(s.rect.tl),
                    tr: n(s.rect.tr),
                    bl: n(s.rect.bl),
                    br: n(s.rect.br)
                }) : s.clip && t.push({
                    type: "clip",
                    tl: n(s.clip.tl),
                    bl: n(s.clip.bl),
                    br: n(s.clip.br),
                    tr: o(s.clip.tl, s.clip.br)
                })
            }
            return t
        }

        function i(e) {
            for (var t = 0; t < e.length; ++t)
                if (e[t].gcip) return e[t];
            return null
        }

        function a() {
            l.postMessage({
                message: "version",
                version: d.getVersion(),
                supports: f,
                challenge: d.getChallenge()
            })
        }
        Object.defineProperty(t, "__esModule", {
            value: !0
        });
        var u = r(2),
            c = r(0),
            l = self,
            f = {
                clips: !0,
                clips2: !0
            },
            p = function () {
                function e() {
                    this.construct = c.Module.cwrap("createGCIP", "number"), this.id = this.construct(), this._destruct = c.Module.cwrap("freeGCIP", "number", ["number"]), this._readImage = c.Module.cwrap("readImage", "string", ["number", "number", "number", "number"]), this._setOptionBool = c.Module.cwrap("setOptionBool", null, ["number", "string", "number"]), this._getRects = c.Module.cwrap("getRects", "string", ["number", "number", "number", "number"]), this._getExtraDataKeys = c.Module.cwrap("getExtraDataKeys", "string", ["number"]), this.getVersion = c.Module.cwrap("getVersion", "string"), this.getChallenge = c.Module.cwrap("getChallenge", "string"), this.setChallengeResponse = c.Module.cwrap("setChallengeResponse", "number", ["string"])
                }
                return e.prototype.destroy = function () {
                    return this._destruct(this.id)
                }, e.prototype.readImage = function (e, t, r) {
                    var n = c.Module._malloc(e * t);
                    c.Module.HEAPU8.set(r, n);
                    var o = this._readImage(this.id, e, t, n);
                    return c.Module._free(n), o
                }, e.prototype.setOptionBool = function (e, t) {
                    void 0 === t && (t = !0), this._setOptionBool(this.id, e, t ? 1 : 0)
                }, e.prototype.getRects = function (e, t, r) {
                    var n = c.Module._malloc(e * t);
                    c.Module.HEAPU8.set(r, n);
                    var o = this._getRects(this.id, e, t, n);
                    return c.Module._free(n), o
                }, e.prototype.getExtraDataKeys = function () {
                    return this._getExtraDataKeys(this.id)
                }, e
            }(),
            d = new p;
        l.addEventListener("message", function (e) {
            var t, r, n, o, c = e.data;
            if (c && c.fn) switch (c.buf && c.buf instanceof ArrayBuffer && (c.buf = new Uint8Array(c.buf)), c.fn) {
                case "init":
                    a();
                    break;
                case "readImage":
                    var f;
                    if (c.opts)
                        for (f in c.opts) switch (typeof c.opts[f]) {
                            case "boolean":
                                d.setOptionBool(f, c.opts[f])
                        }
                    if (o = d.readImage(c.width, c.height, c.buf)) try {
                        n = JSON.parse(o)
                    } catch (e) {
                        console.log("Failed to parse")
                    }
                    if (c.opts && c.opts.gcip_v2) r = o, t = s(n);
                    else {
                        i(n) ? (r = JSON.stringify(n[0].gcip), t = s([n[0]])) : (t = s(n), r = "")
                    }
                    var p, g = d.getExtraDataKeys();
                    try {
                        p = JSON.parse(g)
                    } catch (e) {
                        p = {}, console.log("Failed to parse " + g)
                    }
                    for (f in p)
                        if (p[f])
                            for (var b in p[f]) {
                                var h = p[f][b];
                                h && "string" == typeof h.data && "base64:" == h.data.substr(0, 7) && (h.buffer = u.decodeArrayBuffer(h.data.substr(7)), delete h.data)
                            }
                    l.postMessage({
                        message: "gcip",
                        scan: r,
                        rects: t,
                        extra: p
                    });
                    break;
                case "getRects":
                    if (t = d.getRects(c.width, c.height, c.buf)) try {
                        t = JSON.parse(t)
                    } catch (e) {
                        console.log("Failed to parse")
                    }
                    t = s(t), l.postMessage({
                        message: "rect",
                        rects: t
                    });
                    break;
                case "setChallengeResponse":
                    d.setChallengeResponse(c.response);
                    break;
                case "destroy":
                    l.close();
                    break;
                default:
                    console.log("Web worker couldn't figure out what you mean", c)
            }
        }, !1), l.postMessage({
            message: "ready"
        }), a()
    }, function (e, t, r) {
        "use strict";
        var n;
        ! function (e) {
            function t(e) {
                var t = e.length / 4 * 3,
                    r = new ArrayBuffer(t);
                return n(e, r), r
            }

            function r(e) {
                return 64 == o.indexOf(e.charAt(e.length - 1)) ? e.substring(0, e.length - 1) : e
            }

            function n(e, t) {
                e = r(e), e = r(e);
                var n, s, i, a, u, c, l, f, p = parseInt(String(e.length / 4 * 3), 10),
                    d = 0,
                    g = 0;
                for (n = t ? new Uint8Array(t) : new Uint8Array(p), e = e.replace(/[^A-Za-z0-9\+\/\=]/g, ""), d = 0; d < p; d += 3) u = o.indexOf(e.charAt(g++)), c = o.indexOf(e.charAt(g++)), l = o.indexOf(e.charAt(g++)), f = o.indexOf(e.charAt(g++)), s = u << 2 | c >> 4, i = (15 & c) << 4 | l >> 2, a = (3 & l) << 6 | f, n[d] = s, 64 != l && (n[d + 1] = i), 64 != f && (n[d + 2] = a);
                return n
            }
            var o = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            e.decodeArrayBuffer = t, e.decode = n
        }(n || (n = {})), e.exports = n
    }])
});