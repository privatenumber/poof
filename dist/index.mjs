#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import N from 'tty';
import require$$1 from 'util';
import require$$0 from 'os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var src = {exports: {}};

var browser = {exports: {}};

var ms;
var hasRequiredMs;

function requireMs () {
	if (hasRequiredMs) return ms;
	hasRequiredMs = 1;
	var s = 1e3;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var w = d * 7;
	var y = d * 365.25;
	ms = function(val, options) {
	  options = options || {};
	  var type = typeof val;
	  if (type === "string" && val.length > 0) {
	    return parse(val);
	  } else if (type === "number" && isFinite(val)) {
	    return options.long ? fmtLong(val) : fmtShort(val);
	  }
	  throw new Error(
	    "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
	  );
	};
	function parse(str) {
	  str = String(str);
	  if (str.length > 100) {
	    return;
	  }
	  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
	    str
	  );
	  if (!match) {
	    return;
	  }
	  var n = parseFloat(match[1]);
	  var type = (match[2] || "ms").toLowerCase();
	  switch (type) {
	    case "years":
	    case "year":
	    case "yrs":
	    case "yr":
	    case "y":
	      return n * y;
	    case "weeks":
	    case "week":
	    case "w":
	      return n * w;
	    case "days":
	    case "day":
	    case "d":
	      return n * d;
	    case "hours":
	    case "hour":
	    case "hrs":
	    case "hr":
	    case "h":
	      return n * h;
	    case "minutes":
	    case "minute":
	    case "mins":
	    case "min":
	    case "m":
	      return n * m;
	    case "seconds":
	    case "second":
	    case "secs":
	    case "sec":
	    case "s":
	      return n * s;
	    case "milliseconds":
	    case "millisecond":
	    case "msecs":
	    case "msec":
	    case "ms":
	      return n;
	    default:
	      return void 0;
	  }
	}
	function fmtShort(ms) {
	  var msAbs = Math.abs(ms);
	  if (msAbs >= d) {
	    return Math.round(ms / d) + "d";
	  }
	  if (msAbs >= h) {
	    return Math.round(ms / h) + "h";
	  }
	  if (msAbs >= m) {
	    return Math.round(ms / m) + "m";
	  }
	  if (msAbs >= s) {
	    return Math.round(ms / s) + "s";
	  }
	  return ms + "ms";
	}
	function fmtLong(ms) {
	  var msAbs = Math.abs(ms);
	  if (msAbs >= d) {
	    return plural(ms, msAbs, d, "day");
	  }
	  if (msAbs >= h) {
	    return plural(ms, msAbs, h, "hour");
	  }
	  if (msAbs >= m) {
	    return plural(ms, msAbs, m, "minute");
	  }
	  if (msAbs >= s) {
	    return plural(ms, msAbs, s, "second");
	  }
	  return ms + " ms";
	}
	function plural(ms, msAbs, n, name) {
	  var isPlural = msAbs >= n * 1.5;
	  return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
	}
	return ms;
}

var common;
var hasRequiredCommon;

function requireCommon () {
	if (hasRequiredCommon) return common;
	hasRequiredCommon = 1;
	function setup(env) {
	  createDebug.debug = createDebug;
	  createDebug.default = createDebug;
	  createDebug.coerce = coerce;
	  createDebug.disable = disable;
	  createDebug.enable = enable;
	  createDebug.enabled = enabled;
	  createDebug.humanize = requireMs();
	  createDebug.destroy = destroy;
	  Object.keys(env).forEach((key) => {
	    createDebug[key] = env[key];
	  });
	  createDebug.names = [];
	  createDebug.skips = [];
	  createDebug.formatters = {};
	  function selectColor(namespace) {
	    let hash = 0;
	    for (let i = 0; i < namespace.length; i++) {
	      hash = (hash << 5) - hash + namespace.charCodeAt(i);
	      hash |= 0;
	    }
	    return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	  }
	  createDebug.selectColor = selectColor;
	  function createDebug(namespace) {
	    let prevTime;
	    let enableOverride = null;
	    let namespacesCache;
	    let enabledCache;
	    function debug(...args) {
	      if (!debug.enabled) {
	        return;
	      }
	      const self = debug;
	      const curr = Number(/* @__PURE__ */ new Date());
	      const ms = curr - (prevTime || curr);
	      self.diff = ms;
	      self.prev = prevTime;
	      self.curr = curr;
	      prevTime = curr;
	      args[0] = createDebug.coerce(args[0]);
	      if (typeof args[0] !== "string") {
	        args.unshift("%O");
	      }
	      let index = 0;
	      args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
	        if (match === "%%") {
	          return "%";
	        }
	        index++;
	        const formatter = createDebug.formatters[format];
	        if (typeof formatter === "function") {
	          const val = args[index];
	          match = formatter.call(self, val);
	          args.splice(index, 1);
	          index--;
	        }
	        return match;
	      });
	      createDebug.formatArgs.call(self, args);
	      const logFn = self.log || createDebug.log;
	      logFn.apply(self, args);
	    }
	    debug.namespace = namespace;
	    debug.useColors = createDebug.useColors();
	    debug.color = createDebug.selectColor(namespace);
	    debug.extend = extend;
	    debug.destroy = createDebug.destroy;
	    Object.defineProperty(debug, "enabled", {
	      enumerable: true,
	      configurable: false,
	      get: () => {
	        if (enableOverride !== null) {
	          return enableOverride;
	        }
	        if (namespacesCache !== createDebug.namespaces) {
	          namespacesCache = createDebug.namespaces;
	          enabledCache = createDebug.enabled(namespace);
	        }
	        return enabledCache;
	      },
	      set: (v) => {
	        enableOverride = v;
	      }
	    });
	    if (typeof createDebug.init === "function") {
	      createDebug.init(debug);
	    }
	    return debug;
	  }
	  function extend(namespace, delimiter) {
	    const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
	    newDebug.log = this.log;
	    return newDebug;
	  }
	  function enable(namespaces) {
	    createDebug.save(namespaces);
	    createDebug.namespaces = namespaces;
	    createDebug.names = [];
	    createDebug.skips = [];
	    const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
	    for (const ns of split) {
	      if (ns[0] === "-") {
	        createDebug.skips.push(ns.slice(1));
	      } else {
	        createDebug.names.push(ns);
	      }
	    }
	  }
	  function matchesTemplate(search, template) {
	    let searchIndex = 0;
	    let templateIndex = 0;
	    let starIndex = -1;
	    let matchIndex = 0;
	    while (searchIndex < search.length) {
	      if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
	        if (template[templateIndex] === "*") {
	          starIndex = templateIndex;
	          matchIndex = searchIndex;
	          templateIndex++;
	        } else {
	          searchIndex++;
	          templateIndex++;
	        }
	      } else if (starIndex !== -1) {
	        templateIndex = starIndex + 1;
	        matchIndex++;
	        searchIndex = matchIndex;
	      } else {
	        return false;
	      }
	    }
	    while (templateIndex < template.length && template[templateIndex] === "*") {
	      templateIndex++;
	    }
	    return templateIndex === template.length;
	  }
	  function disable() {
	    const namespaces = [
	      ...createDebug.names,
	      ...createDebug.skips.map((namespace) => "-" + namespace)
	    ].join(",");
	    createDebug.enable("");
	    return namespaces;
	  }
	  function enabled(name) {
	    for (const skip of createDebug.skips) {
	      if (matchesTemplate(name, skip)) {
	        return false;
	      }
	    }
	    for (const ns of createDebug.names) {
	      if (matchesTemplate(name, ns)) {
	        return true;
	      }
	    }
	    return false;
	  }
	  function coerce(val) {
	    if (val instanceof Error) {
	      return val.stack || val.message;
	    }
	    return val;
	  }
	  function destroy() {
	    console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
	  }
	  createDebug.enable(createDebug.load());
	  return createDebug;
	}
	common = setup;
	return common;
}

var hasRequiredBrowser;

function requireBrowser () {
	if (hasRequiredBrowser) return browser.exports;
	hasRequiredBrowser = 1;
	(function (module, exports$1) {
		exports$1.formatArgs = formatArgs;
		exports$1.save = save;
		exports$1.load = load;
		exports$1.useColors = useColors;
		exports$1.storage = localstorage();
		exports$1.destroy = /* @__PURE__ */ (() => {
		  let warned = false;
		  return () => {
		    if (!warned) {
		      warned = true;
		      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
		    }
		  };
		})();
		exports$1.colors = [
		  "#0000CC",
		  "#0000FF",
		  "#0033CC",
		  "#0033FF",
		  "#0066CC",
		  "#0066FF",
		  "#0099CC",
		  "#0099FF",
		  "#00CC00",
		  "#00CC33",
		  "#00CC66",
		  "#00CC99",
		  "#00CCCC",
		  "#00CCFF",
		  "#3300CC",
		  "#3300FF",
		  "#3333CC",
		  "#3333FF",
		  "#3366CC",
		  "#3366FF",
		  "#3399CC",
		  "#3399FF",
		  "#33CC00",
		  "#33CC33",
		  "#33CC66",
		  "#33CC99",
		  "#33CCCC",
		  "#33CCFF",
		  "#6600CC",
		  "#6600FF",
		  "#6633CC",
		  "#6633FF",
		  "#66CC00",
		  "#66CC33",
		  "#9900CC",
		  "#9900FF",
		  "#9933CC",
		  "#9933FF",
		  "#99CC00",
		  "#99CC33",
		  "#CC0000",
		  "#CC0033",
		  "#CC0066",
		  "#CC0099",
		  "#CC00CC",
		  "#CC00FF",
		  "#CC3300",
		  "#CC3333",
		  "#CC3366",
		  "#CC3399",
		  "#CC33CC",
		  "#CC33FF",
		  "#CC6600",
		  "#CC6633",
		  "#CC9900",
		  "#CC9933",
		  "#CCCC00",
		  "#CCCC33",
		  "#FF0000",
		  "#FF0033",
		  "#FF0066",
		  "#FF0099",
		  "#FF00CC",
		  "#FF00FF",
		  "#FF3300",
		  "#FF3333",
		  "#FF3366",
		  "#FF3399",
		  "#FF33CC",
		  "#FF33FF",
		  "#FF6600",
		  "#FF6633",
		  "#FF9900",
		  "#FF9933",
		  "#FFCC00",
		  "#FFCC33"
		];
		function useColors() {
		  if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
		    return true;
		  }
		  if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		    return false;
		  }
		  let m;
		  return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
		  typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
		  // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		  typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
		  typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
		}
		function formatArgs(args) {
		  args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
		  if (!this.useColors) {
		    return;
		  }
		  const c = "color: " + this.color;
		  args.splice(1, 0, c, "color: inherit");
		  let index = 0;
		  let lastC = 0;
		  args[0].replace(/%[a-zA-Z%]/g, (match) => {
		    if (match === "%%") {
		      return;
		    }
		    index++;
		    if (match === "%c") {
		      lastC = index;
		    }
		  });
		  args.splice(lastC, 0, c);
		}
		exports$1.log = console.debug || console.log || (() => {
		});
		function save(namespaces) {
		  try {
		    if (namespaces) {
		      exports$1.storage.setItem("debug", namespaces);
		    } else {
		      exports$1.storage.removeItem("debug");
		    }
		  } catch (error) {
		  }
		}
		function load() {
		  let r;
		  try {
		    r = exports$1.storage.getItem("debug") || exports$1.storage.getItem("DEBUG");
		  } catch (error) {
		  }
		  if (!r && typeof process !== "undefined" && "env" in process) {
		    r = process.env.DEBUG;
		  }
		  return r;
		}
		function localstorage() {
		  try {
		    return localStorage;
		  } catch (error) {
		  }
		}
		module.exports = requireCommon()(exports$1);
		const { formatters } = module.exports;
		formatters.j = function(v) {
		  try {
		    return JSON.stringify(v);
		  } catch (error) {
		    return "[UnexpectedJSONParseError]: " + error.message;
		  }
		}; 
	} (browser, browser.exports));
	return browser.exports;
}

var node = {exports: {}};

var hasFlag;
var hasRequiredHasFlag;

function requireHasFlag () {
	if (hasRequiredHasFlag) return hasFlag;
	hasRequiredHasFlag = 1;
	hasFlag = (flag, argv = process.argv) => {
	  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
	  const position = argv.indexOf(prefix + flag);
	  const terminatorPosition = argv.indexOf("--");
	  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
	};
	return hasFlag;
}

var supportsColor_1;
var hasRequiredSupportsColor;

function requireSupportsColor () {
	if (hasRequiredSupportsColor) return supportsColor_1;
	hasRequiredSupportsColor = 1;
	const os = require$$0;
	const tty = N;
	const hasFlag = requireHasFlag();
	const { env } = process;
	let forceColor;
	if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
	  forceColor = 0;
	} else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
	  forceColor = 1;
	}
	if ("FORCE_COLOR" in env) {
	  if (env.FORCE_COLOR === "true") {
	    forceColor = 1;
	  } else if (env.FORCE_COLOR === "false") {
	    forceColor = 0;
	  } else {
	    forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
	  }
	}
	function translateLevel(level) {
	  if (level === 0) {
	    return false;
	  }
	  return {
	    level,
	    hasBasic: true,
	    has256: level >= 2,
	    has16m: level >= 3
	  };
	}
	function supportsColor(haveStream, streamIsTTY) {
	  if (forceColor === 0) {
	    return 0;
	  }
	  if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
	    return 3;
	  }
	  if (hasFlag("color=256")) {
	    return 2;
	  }
	  if (haveStream && !streamIsTTY && forceColor === void 0) {
	    return 0;
	  }
	  const min = forceColor || 0;
	  if (env.TERM === "dumb") {
	    return min;
	  }
	  if (process.platform === "win32") {
	    const osRelease = os.release().split(".");
	    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
	      return Number(osRelease[2]) >= 14931 ? 3 : 2;
	    }
	    return 1;
	  }
	  if ("CI" in env) {
	    if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
	      return 1;
	    }
	    return min;
	  }
	  if ("TEAMCITY_VERSION" in env) {
	    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
	  }
	  if (env.COLORTERM === "truecolor") {
	    return 3;
	  }
	  if ("TERM_PROGRAM" in env) {
	    const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
	    switch (env.TERM_PROGRAM) {
	      case "iTerm.app":
	        return version >= 3 ? 3 : 2;
	      case "Apple_Terminal":
	        return 2;
	    }
	  }
	  if (/-256(color)?$/i.test(env.TERM)) {
	    return 2;
	  }
	  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
	    return 1;
	  }
	  if ("COLORTERM" in env) {
	    return 1;
	  }
	  return min;
	}
	function getSupportLevel(stream) {
	  const level = supportsColor(stream, stream && stream.isTTY);
	  return translateLevel(level);
	}
	supportsColor_1 = {
	  supportsColor: getSupportLevel,
	  stdout: translateLevel(supportsColor(true, tty.isatty(1))),
	  stderr: translateLevel(supportsColor(true, tty.isatty(2)))
	};
	return supportsColor_1;
}

var hasRequiredNode;

function requireNode () {
	if (hasRequiredNode) return node.exports;
	hasRequiredNode = 1;
	(function (module, exports$1) {
		const tty = N;
		const util = require$$1;
		exports$1.init = init;
		exports$1.log = log;
		exports$1.formatArgs = formatArgs;
		exports$1.save = save;
		exports$1.load = load;
		exports$1.useColors = useColors;
		exports$1.destroy = util.deprecate(
		  () => {
		  },
		  "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
		);
		exports$1.colors = [6, 2, 3, 4, 5, 1];
		try {
		  const supportsColor = requireSupportsColor();
		  if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
		    exports$1.colors = [
		      20,
		      21,
		      26,
		      27,
		      32,
		      33,
		      38,
		      39,
		      40,
		      41,
		      42,
		      43,
		      44,
		      45,
		      56,
		      57,
		      62,
		      63,
		      68,
		      69,
		      74,
		      75,
		      76,
		      77,
		      78,
		      79,
		      80,
		      81,
		      92,
		      93,
		      98,
		      99,
		      112,
		      113,
		      128,
		      129,
		      134,
		      135,
		      148,
		      149,
		      160,
		      161,
		      162,
		      163,
		      164,
		      165,
		      166,
		      167,
		      168,
		      169,
		      170,
		      171,
		      172,
		      173,
		      178,
		      179,
		      184,
		      185,
		      196,
		      197,
		      198,
		      199,
		      200,
		      201,
		      202,
		      203,
		      204,
		      205,
		      206,
		      207,
		      208,
		      209,
		      214,
		      215,
		      220,
		      221
		    ];
		  }
		} catch (error) {
		}
		exports$1.inspectOpts = Object.keys(process.env).filter((key) => {
		  return /^debug_/i.test(key);
		}).reduce((obj, key) => {
		  const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
		    return k.toUpperCase();
		  });
		  let val = process.env[key];
		  if (/^(yes|on|true|enabled)$/i.test(val)) {
		    val = true;
		  } else if (/^(no|off|false|disabled)$/i.test(val)) {
		    val = false;
		  } else if (val === "null") {
		    val = null;
		  } else {
		    val = Number(val);
		  }
		  obj[prop] = val;
		  return obj;
		}, {});
		function useColors() {
		  return "colors" in exports$1.inspectOpts ? Boolean(exports$1.inspectOpts.colors) : tty.isatty(process.stderr.fd);
		}
		function formatArgs(args) {
		  const { namespace: name, useColors: useColors2 } = this;
		  if (useColors2) {
		    const c = this.color;
		    const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
		    const prefix = `  ${colorCode};1m${name} \x1B[0m`;
		    args[0] = prefix + args[0].split("\n").join("\n" + prefix);
		    args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
		  } else {
		    args[0] = getDate() + name + " " + args[0];
		  }
		}
		function getDate() {
		  if (exports$1.inspectOpts.hideDate) {
		    return "";
		  }
		  return (/* @__PURE__ */ new Date()).toISOString() + " ";
		}
		function log(...args) {
		  return process.stderr.write(util.formatWithOptions(exports$1.inspectOpts, ...args) + "\n");
		}
		function save(namespaces) {
		  if (namespaces) {
		    process.env.DEBUG = namespaces;
		  } else {
		    delete process.env.DEBUG;
		  }
		}
		function load() {
		  return process.env.DEBUG;
		}
		function init(debug) {
		  debug.inspectOpts = {};
		  const keys = Object.keys(exports$1.inspectOpts);
		  for (let i = 0; i < keys.length; i++) {
		    debug.inspectOpts[keys[i]] = exports$1.inspectOpts[keys[i]];
		  }
		}
		module.exports = requireCommon()(exports$1);
		const { formatters } = module.exports;
		formatters.o = function(v) {
		  this.inspectOpts.colors = this.useColors;
		  return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
		};
		formatters.O = function(v) {
		  this.inspectOpts.colors = this.useColors;
		  return util.inspect(v, this.inspectOpts);
		}; 
	} (node, node.exports));
	return node.exports;
}

var hasRequiredSrc;

function requireSrc () {
	if (hasRequiredSrc) return src.exports;
	hasRequiredSrc = 1;
	if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
	  src.exports = requireBrowser();
	} else {
	  src.exports = requireNode();
	}
	return src.exports;
}

var srcExports = requireSrc();
var createDebug = /*@__PURE__*/getDefaultExportFromCjs(srcExports);

var utils = {};

var constants;
var hasRequiredConstants;

function requireConstants () {
	if (hasRequiredConstants) return constants;
	hasRequiredConstants = 1;
	const WIN_SLASH = "\\\\/";
	const WIN_NO_SLASH = `[^${WIN_SLASH}]`;
	const DOT_LITERAL = "\\.";
	const PLUS_LITERAL = "\\+";
	const QMARK_LITERAL = "\\?";
	const SLASH_LITERAL = "\\/";
	const ONE_CHAR = "(?=.)";
	const QMARK = "[^/]";
	const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
	const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
	const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
	const NO_DOT = `(?!${DOT_LITERAL})`;
	const NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
	const NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
	const NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
	const QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
	const STAR = `${QMARK}*?`;
	const SEP = "/";
	const POSIX_CHARS = {
	  DOT_LITERAL,
	  PLUS_LITERAL,
	  QMARK_LITERAL,
	  SLASH_LITERAL,
	  ONE_CHAR,
	  QMARK,
	  END_ANCHOR,
	  DOTS_SLASH,
	  NO_DOT,
	  NO_DOTS,
	  NO_DOT_SLASH,
	  NO_DOTS_SLASH,
	  QMARK_NO_DOT,
	  STAR,
	  START_ANCHOR,
	  SEP
	};
	const WINDOWS_CHARS = {
	  ...POSIX_CHARS,
	  SLASH_LITERAL: `[${WIN_SLASH}]`,
	  QMARK: WIN_NO_SLASH,
	  STAR: `${WIN_NO_SLASH}*?`,
	  DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
	  NO_DOT: `(?!${DOT_LITERAL})`,
	  NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
	  NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
	  NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
	  QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
	  START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
	  END_ANCHOR: `(?:[${WIN_SLASH}]|$)`,
	  SEP: "\\"
	};
	const POSIX_REGEX_SOURCE = {
	  alnum: "a-zA-Z0-9",
	  alpha: "a-zA-Z",
	  ascii: "\\x00-\\x7F",
	  blank: " \\t",
	  cntrl: "\\x00-\\x1F\\x7F",
	  digit: "0-9",
	  graph: "\\x21-\\x7E",
	  lower: "a-z",
	  print: "\\x20-\\x7E ",
	  punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
	  space: " \\t\\r\\n\\v\\f",
	  upper: "A-Z",
	  word: "A-Za-z0-9_",
	  xdigit: "A-Fa-f0-9"
	};
	constants = {
	  MAX_LENGTH: 1024 * 64,
	  POSIX_REGEX_SOURCE,
	  // regular expressions
	  REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
	  REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
	  REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
	  REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
	  REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
	  REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
	  // Replace globs with equivalent patterns to reduce parsing time.
	  REPLACEMENTS: {
	    __proto__: null,
	    "***": "*",
	    "**/**": "**",
	    "**/**/**": "**"
	  },
	  // Digits
	  CHAR_0: 48,
	  /* 0 */
	  CHAR_9: 57,
	  /* 9 */
	  // Alphabet chars.
	  CHAR_UPPERCASE_A: 65,
	  /* A */
	  CHAR_LOWERCASE_A: 97,
	  /* a */
	  CHAR_UPPERCASE_Z: 90,
	  /* Z */
	  CHAR_LOWERCASE_Z: 122,
	  /* z */
	  CHAR_LEFT_PARENTHESES: 40,
	  /* ( */
	  CHAR_RIGHT_PARENTHESES: 41,
	  /* ) */
	  CHAR_ASTERISK: 42,
	  /* * */
	  // Non-alphabetic chars.
	  CHAR_AMPERSAND: 38,
	  /* & */
	  CHAR_AT: 64,
	  /* @ */
	  CHAR_BACKWARD_SLASH: 92,
	  /* \ */
	  CHAR_CARRIAGE_RETURN: 13,
	  /* \r */
	  CHAR_CIRCUMFLEX_ACCENT: 94,
	  /* ^ */
	  CHAR_COLON: 58,
	  /* : */
	  CHAR_COMMA: 44,
	  /* , */
	  CHAR_DOT: 46,
	  /* . */
	  CHAR_DOUBLE_QUOTE: 34,
	  /* " */
	  CHAR_EQUAL: 61,
	  /* = */
	  CHAR_EXCLAMATION_MARK: 33,
	  /* ! */
	  CHAR_FORM_FEED: 12,
	  /* \f */
	  CHAR_FORWARD_SLASH: 47,
	  /* / */
	  CHAR_GRAVE_ACCENT: 96,
	  /* ` */
	  CHAR_HASH: 35,
	  /* # */
	  CHAR_HYPHEN_MINUS: 45,
	  /* - */
	  CHAR_LEFT_ANGLE_BRACKET: 60,
	  /* < */
	  CHAR_LEFT_CURLY_BRACE: 123,
	  /* { */
	  CHAR_LEFT_SQUARE_BRACKET: 91,
	  /* [ */
	  CHAR_LINE_FEED: 10,
	  /* \n */
	  CHAR_NO_BREAK_SPACE: 160,
	  /* \u00A0 */
	  CHAR_PERCENT: 37,
	  /* % */
	  CHAR_PLUS: 43,
	  /* + */
	  CHAR_QUESTION_MARK: 63,
	  /* ? */
	  CHAR_RIGHT_ANGLE_BRACKET: 62,
	  /* > */
	  CHAR_RIGHT_CURLY_BRACE: 125,
	  /* } */
	  CHAR_RIGHT_SQUARE_BRACKET: 93,
	  /* ] */
	  CHAR_SEMICOLON: 59,
	  /* ; */
	  CHAR_SINGLE_QUOTE: 39,
	  /* ' */
	  CHAR_SPACE: 32,
	  /*   */
	  CHAR_TAB: 9,
	  /* \t */
	  CHAR_UNDERSCORE: 95,
	  /* _ */
	  CHAR_VERTICAL_LINE: 124,
	  /* | */
	  CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
	  /* \uFEFF */
	  /**
	   * Create EXTGLOB_CHARS
	   */
	  extglobChars(chars) {
	    return {
	      "!": { type: "negate", open: "(?:(?!(?:", close: `))${chars.STAR})` },
	      "?": { type: "qmark", open: "(?:", close: ")?" },
	      "+": { type: "plus", open: "(?:", close: ")+" },
	      "*": { type: "star", open: "(?:", close: ")*" },
	      "@": { type: "at", open: "(?:", close: ")" }
	    };
	  },
	  /**
	   * Create GLOB_CHARS
	   */
	  globChars(win32) {
	    return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
	  }
	};
	return constants;
}

var hasRequiredUtils;

function requireUtils () {
	if (hasRequiredUtils) return utils;
	hasRequiredUtils = 1;
	(function (exports$1) {
		const {
		  REGEX_BACKSLASH,
		  REGEX_REMOVE_BACKSLASH,
		  REGEX_SPECIAL_CHARS,
		  REGEX_SPECIAL_CHARS_GLOBAL
		} = /*@__PURE__*/ requireConstants();
		exports$1.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
		exports$1.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
		exports$1.isRegexChar = (str) => str.length === 1 && exports$1.hasRegexChars(str);
		exports$1.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
		exports$1.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
		exports$1.isWindows = () => {
		  if (typeof navigator !== "undefined" && navigator.platform) {
		    const platform = navigator.platform.toLowerCase();
		    return platform === "win32" || platform === "windows";
		  }
		  if (typeof process !== "undefined" && process.platform) {
		    return process.platform === "win32";
		  }
		  return false;
		};
		exports$1.removeBackslashes = (str) => {
		  return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
		    return match === "\\" ? "" : match;
		  });
		};
		exports$1.escapeLast = (input, char, lastIdx) => {
		  const idx = input.lastIndexOf(char, lastIdx);
		  if (idx === -1) return input;
		  if (input[idx - 1] === "\\") return exports$1.escapeLast(input, char, idx - 1);
		  return `${input.slice(0, idx)}\\${input.slice(idx)}`;
		};
		exports$1.removePrefix = (input, state = {}) => {
		  let output = input;
		  if (output.startsWith("./")) {
		    output = output.slice(2);
		    state.prefix = "./";
		  }
		  return output;
		};
		exports$1.wrapOutput = (input, state = {}, options = {}) => {
		  const prepend = options.contains ? "" : "^";
		  const append = options.contains ? "" : "$";
		  let output = `${prepend}(?:${input})${append}`;
		  if (state.negated === true) {
		    output = `(?:^(?!${output}).*$)`;
		  }
		  return output;
		};
		exports$1.basename = (path, { windows } = {}) => {
		  const segs = path.split(windows ? /[\\/]/ : "/");
		  const last = segs[segs.length - 1];
		  if (last === "") {
		    return segs[segs.length - 2];
		  }
		  return last;
		}; 
	} (utils));
	return utils;
}

var scan_1;
var hasRequiredScan;

function requireScan () {
	if (hasRequiredScan) return scan_1;
	hasRequiredScan = 1;
	const utils = /*@__PURE__*/ requireUtils();
	const {
	  CHAR_ASTERISK,
	  /* * */
	  CHAR_AT,
	  /* @ */
	  CHAR_BACKWARD_SLASH,
	  /* \ */
	  CHAR_COMMA,
	  /* , */
	  CHAR_DOT,
	  /* . */
	  CHAR_EXCLAMATION_MARK,
	  /* ! */
	  CHAR_FORWARD_SLASH,
	  /* / */
	  CHAR_LEFT_CURLY_BRACE,
	  /* { */
	  CHAR_LEFT_PARENTHESES,
	  /* ( */
	  CHAR_LEFT_SQUARE_BRACKET,
	  /* [ */
	  CHAR_PLUS,
	  /* + */
	  CHAR_QUESTION_MARK,
	  /* ? */
	  CHAR_RIGHT_CURLY_BRACE,
	  /* } */
	  CHAR_RIGHT_PARENTHESES,
	  /* ) */
	  CHAR_RIGHT_SQUARE_BRACKET
	  /* ] */
	} = /*@__PURE__*/ requireConstants();
	const isPathSeparator = (code) => {
	  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
	};
	const depth = (token) => {
	  if (token.isPrefix !== true) {
	    token.depth = token.isGlobstar ? Infinity : 1;
	  }
	};
	const scan = (input, options) => {
	  const opts = options || {};
	  const length = input.length - 1;
	  const scanToEnd = opts.parts === true || opts.scanToEnd === true;
	  const slashes = [];
	  const tokens = [];
	  const parts = [];
	  let str = input;
	  let index = -1;
	  let start = 0;
	  let lastIndex = 0;
	  let isBrace = false;
	  let isBracket = false;
	  let isGlob = false;
	  let isExtglob = false;
	  let isGlobstar = false;
	  let braceEscaped = false;
	  let backslashes = false;
	  let negated = false;
	  let negatedExtglob = false;
	  let finished = false;
	  let braces = 0;
	  let prev;
	  let code;
	  let token = { value: "", depth: 0, isGlob: false };
	  const eos = () => index >= length;
	  const peek = () => str.charCodeAt(index + 1);
	  const advance = () => {
	    prev = code;
	    return str.charCodeAt(++index);
	  };
	  while (index < length) {
	    code = advance();
	    let next;
	    if (code === CHAR_BACKWARD_SLASH) {
	      backslashes = token.backslashes = true;
	      code = advance();
	      if (code === CHAR_LEFT_CURLY_BRACE) {
	        braceEscaped = true;
	      }
	      continue;
	    }
	    if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
	      braces++;
	      while (eos() !== true && (code = advance())) {
	        if (code === CHAR_BACKWARD_SLASH) {
	          backslashes = token.backslashes = true;
	          advance();
	          continue;
	        }
	        if (code === CHAR_LEFT_CURLY_BRACE) {
	          braces++;
	          continue;
	        }
	        if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
	          isBrace = token.isBrace = true;
	          isGlob = token.isGlob = true;
	          finished = true;
	          if (scanToEnd === true) {
	            continue;
	          }
	          break;
	        }
	        if (braceEscaped !== true && code === CHAR_COMMA) {
	          isBrace = token.isBrace = true;
	          isGlob = token.isGlob = true;
	          finished = true;
	          if (scanToEnd === true) {
	            continue;
	          }
	          break;
	        }
	        if (code === CHAR_RIGHT_CURLY_BRACE) {
	          braces--;
	          if (braces === 0) {
	            braceEscaped = false;
	            isBrace = token.isBrace = true;
	            finished = true;
	            break;
	          }
	        }
	      }
	      if (scanToEnd === true) {
	        continue;
	      }
	      break;
	    }
	    if (code === CHAR_FORWARD_SLASH) {
	      slashes.push(index);
	      tokens.push(token);
	      token = { value: "", depth: 0, isGlob: false };
	      if (finished === true) continue;
	      if (prev === CHAR_DOT && index === start + 1) {
	        start += 2;
	        continue;
	      }
	      lastIndex = index + 1;
	      continue;
	    }
	    if (opts.noext !== true) {
	      const isExtglobChar = code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK;
	      if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
	        isGlob = token.isGlob = true;
	        isExtglob = token.isExtglob = true;
	        finished = true;
	        if (code === CHAR_EXCLAMATION_MARK && index === start) {
	          negatedExtglob = true;
	        }
	        if (scanToEnd === true) {
	          while (eos() !== true && (code = advance())) {
	            if (code === CHAR_BACKWARD_SLASH) {
	              backslashes = token.backslashes = true;
	              code = advance();
	              continue;
	            }
	            if (code === CHAR_RIGHT_PARENTHESES) {
	              isGlob = token.isGlob = true;
	              finished = true;
	              break;
	            }
	          }
	          continue;
	        }
	        break;
	      }
	    }
	    if (code === CHAR_ASTERISK) {
	      if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
	      isGlob = token.isGlob = true;
	      finished = true;
	      if (scanToEnd === true) {
	        continue;
	      }
	      break;
	    }
	    if (code === CHAR_QUESTION_MARK) {
	      isGlob = token.isGlob = true;
	      finished = true;
	      if (scanToEnd === true) {
	        continue;
	      }
	      break;
	    }
	    if (code === CHAR_LEFT_SQUARE_BRACKET) {
	      while (eos() !== true && (next = advance())) {
	        if (next === CHAR_BACKWARD_SLASH) {
	          backslashes = token.backslashes = true;
	          advance();
	          continue;
	        }
	        if (next === CHAR_RIGHT_SQUARE_BRACKET) {
	          isBracket = token.isBracket = true;
	          isGlob = token.isGlob = true;
	          finished = true;
	          break;
	        }
	      }
	      if (scanToEnd === true) {
	        continue;
	      }
	      break;
	    }
	    if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
	      negated = token.negated = true;
	      start++;
	      continue;
	    }
	    if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
	      isGlob = token.isGlob = true;
	      if (scanToEnd === true) {
	        while (eos() !== true && (code = advance())) {
	          if (code === CHAR_LEFT_PARENTHESES) {
	            backslashes = token.backslashes = true;
	            code = advance();
	            continue;
	          }
	          if (code === CHAR_RIGHT_PARENTHESES) {
	            finished = true;
	            break;
	          }
	        }
	        continue;
	      }
	      break;
	    }
	    if (isGlob === true) {
	      finished = true;
	      if (scanToEnd === true) {
	        continue;
	      }
	      break;
	    }
	  }
	  if (opts.noext === true) {
	    isExtglob = false;
	    isGlob = false;
	  }
	  let base = str;
	  let prefix = "";
	  let glob = "";
	  if (start > 0) {
	    prefix = str.slice(0, start);
	    str = str.slice(start);
	    lastIndex -= start;
	  }
	  if (base && isGlob === true && lastIndex > 0) {
	    base = str.slice(0, lastIndex);
	    glob = str.slice(lastIndex);
	  } else if (isGlob === true) {
	    base = "";
	    glob = str;
	  } else {
	    base = str;
	  }
	  if (base && base !== "" && base !== "/" && base !== str) {
	    if (isPathSeparator(base.charCodeAt(base.length - 1))) {
	      base = base.slice(0, -1);
	    }
	  }
	  if (opts.unescape === true) {
	    if (glob) glob = utils.removeBackslashes(glob);
	    if (base && backslashes === true) {
	      base = utils.removeBackslashes(base);
	    }
	  }
	  const state = {
	    prefix,
	    input,
	    start,
	    base,
	    glob,
	    isBrace,
	    isBracket,
	    isGlob,
	    isExtglob,
	    isGlobstar,
	    negated,
	    negatedExtglob
	  };
	  if (opts.tokens === true) {
	    state.maxDepth = 0;
	    if (!isPathSeparator(code)) {
	      tokens.push(token);
	    }
	    state.tokens = tokens;
	  }
	  if (opts.parts === true || opts.tokens === true) {
	    let prevIndex;
	    for (let idx = 0; idx < slashes.length; idx++) {
	      const n = prevIndex ? prevIndex + 1 : start;
	      const i = slashes[idx];
	      const value = input.slice(n, i);
	      if (opts.tokens) {
	        if (idx === 0 && start !== 0) {
	          tokens[idx].isPrefix = true;
	          tokens[idx].value = prefix;
	        } else {
	          tokens[idx].value = value;
	        }
	        depth(tokens[idx]);
	        state.maxDepth += tokens[idx].depth;
	      }
	      if (idx !== 0 || value !== "") {
	        parts.push(value);
	      }
	      prevIndex = i;
	    }
	    if (prevIndex && prevIndex + 1 < input.length) {
	      const value = input.slice(prevIndex + 1);
	      parts.push(value);
	      if (opts.tokens) {
	        tokens[tokens.length - 1].value = value;
	        depth(tokens[tokens.length - 1]);
	        state.maxDepth += tokens[tokens.length - 1].depth;
	      }
	    }
	    state.slashes = slashes;
	    state.parts = parts;
	  }
	  return state;
	};
	scan_1 = scan;
	return scan_1;
}

var parse_1;
var hasRequiredParse;

function requireParse () {
	if (hasRequiredParse) return parse_1;
	hasRequiredParse = 1;
	const constants = /*@__PURE__*/ requireConstants();
	const utils = /*@__PURE__*/ requireUtils();
	const {
	  MAX_LENGTH,
	  POSIX_REGEX_SOURCE,
	  REGEX_NON_SPECIAL_CHARS,
	  REGEX_SPECIAL_CHARS_BACKREF,
	  REPLACEMENTS
	} = constants;
	const expandRange = (args, options) => {
	  if (typeof options.expandRange === "function") {
	    return options.expandRange(...args, options);
	  }
	  args.sort();
	  const value = `[${args.join("-")}]`;
	  try {
	    new RegExp(value);
	  } catch (ex) {
	    return args.map((v) => utils.escapeRegex(v)).join("..");
	  }
	  return value;
	};
	const syntaxError = (type, char) => {
	  return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
	};
	const parse = (input, options) => {
	  if (typeof input !== "string") {
	    throw new TypeError("Expected a string");
	  }
	  input = REPLACEMENTS[input] || input;
	  const opts = { ...options };
	  const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
	  let len = input.length;
	  if (len > max) {
	    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
	  }
	  const bos = { type: "bos", value: "", output: opts.prepend || "" };
	  const tokens = [bos];
	  const capture = opts.capture ? "" : "?:";
	  const PLATFORM_CHARS = constants.globChars(opts.windows);
	  const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
	  const {
	    DOT_LITERAL,
	    PLUS_LITERAL,
	    SLASH_LITERAL,
	    ONE_CHAR,
	    DOTS_SLASH,
	    NO_DOT,
	    NO_DOT_SLASH,
	    NO_DOTS_SLASH,
	    QMARK,
	    QMARK_NO_DOT,
	    STAR,
	    START_ANCHOR
	  } = PLATFORM_CHARS;
	  const globstar = (opts2) => {
	    return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
	  };
	  const nodot = opts.dot ? "" : NO_DOT;
	  const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
	  let star = opts.bash === true ? globstar(opts) : STAR;
	  if (opts.capture) {
	    star = `(${star})`;
	  }
	  if (typeof opts.noext === "boolean") {
	    opts.noextglob = opts.noext;
	  }
	  const state = {
	    input,
	    index: -1,
	    start: 0,
	    dot: opts.dot === true,
	    consumed: "",
	    output: "",
	    prefix: "",
	    backtrack: false,
	    negated: false,
	    brackets: 0,
	    braces: 0,
	    parens: 0,
	    quotes: 0,
	    globstar: false,
	    tokens
	  };
	  input = utils.removePrefix(input, state);
	  len = input.length;
	  const extglobs = [];
	  const braces = [];
	  const stack = [];
	  let prev = bos;
	  let value;
	  const eos = () => state.index === len - 1;
	  const peek = state.peek = (n = 1) => input[state.index + n];
	  const advance = state.advance = () => input[++state.index] || "";
	  const remaining = () => input.slice(state.index + 1);
	  const consume = (value2 = "", num = 0) => {
	    state.consumed += value2;
	    state.index += num;
	  };
	  const append = (token) => {
	    state.output += token.output != null ? token.output : token.value;
	    consume(token.value);
	  };
	  const negate = () => {
	    let count = 1;
	    while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
	      advance();
	      state.start++;
	      count++;
	    }
	    if (count % 2 === 0) {
	      return false;
	    }
	    state.negated = true;
	    state.start++;
	    return true;
	  };
	  const increment = (type) => {
	    state[type]++;
	    stack.push(type);
	  };
	  const decrement = (type) => {
	    state[type]--;
	    stack.pop();
	  };
	  const push = (tok) => {
	    if (prev.type === "globstar") {
	      const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
	      const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
	      if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
	        state.output = state.output.slice(0, -prev.output.length);
	        prev.type = "star";
	        prev.value = "*";
	        prev.output = star;
	        state.output += prev.output;
	      }
	    }
	    if (extglobs.length && tok.type !== "paren") {
	      extglobs[extglobs.length - 1].inner += tok.value;
	    }
	    if (tok.value || tok.output) append(tok);
	    if (prev && prev.type === "text" && tok.type === "text") {
	      prev.output = (prev.output || prev.value) + tok.value;
	      prev.value += tok.value;
	      return;
	    }
	    tok.prev = prev;
	    tokens.push(tok);
	    prev = tok;
	  };
	  const extglobOpen = (type, value2) => {
	    const token = { ...EXTGLOB_CHARS[value2], conditions: 1, inner: "" };
	    token.prev = prev;
	    token.parens = state.parens;
	    token.output = state.output;
	    const output = (opts.capture ? "(" : "") + token.open;
	    increment("parens");
	    push({ type, value: value2, output: state.output ? "" : ONE_CHAR });
	    push({ type: "paren", extglob: true, value: advance(), output });
	    extglobs.push(token);
	  };
	  const extglobClose = (token) => {
	    let output = token.close + (opts.capture ? ")" : "");
	    let rest;
	    if (token.type === "negate") {
	      let extglobStar = star;
	      if (token.inner && token.inner.length > 1 && token.inner.includes("/")) {
	        extglobStar = globstar(opts);
	      }
	      if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
	        output = token.close = `)$))${extglobStar}`;
	      }
	      if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
	        const expression = parse(rest, { ...options, fastpaths: false }).output;
	        output = token.close = `)${expression})${extglobStar})`;
	      }
	      if (token.prev.type === "bos") {
	        state.negatedExtglob = true;
	      }
	    }
	    push({ type: "paren", extglob: true, value, output });
	    decrement("parens");
	  };
	  if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
	    let backslashes = false;
	    let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
	      if (first === "\\") {
	        backslashes = true;
	        return m;
	      }
	      if (first === "?") {
	        if (esc) {
	          return esc + first + (rest ? QMARK.repeat(rest.length) : "");
	        }
	        if (index === 0) {
	          return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
	        }
	        return QMARK.repeat(chars.length);
	      }
	      if (first === ".") {
	        return DOT_LITERAL.repeat(chars.length);
	      }
	      if (first === "*") {
	        if (esc) {
	          return esc + first + (rest ? star : "");
	        }
	        return star;
	      }
	      return esc ? m : `\\${m}`;
	    });
	    if (backslashes === true) {
	      if (opts.unescape === true) {
	        output = output.replace(/\\/g, "");
	      } else {
	        output = output.replace(/\\+/g, (m) => {
	          return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
	        });
	      }
	    }
	    if (output === input && opts.contains === true) {
	      state.output = input;
	      return state;
	    }
	    state.output = utils.wrapOutput(output, state, options);
	    return state;
	  }
	  while (!eos()) {
	    value = advance();
	    if (value === "\0") {
	      continue;
	    }
	    if (value === "\\") {
	      const next = peek();
	      if (next === "/" && opts.bash !== true) {
	        continue;
	      }
	      if (next === "." || next === ";") {
	        continue;
	      }
	      if (!next) {
	        value += "\\";
	        push({ type: "text", value });
	        continue;
	      }
	      const match = /^\\+/.exec(remaining());
	      let slashes = 0;
	      if (match && match[0].length > 2) {
	        slashes = match[0].length;
	        state.index += slashes;
	        if (slashes % 2 !== 0) {
	          value += "\\";
	        }
	      }
	      if (opts.unescape === true) {
	        value = advance();
	      } else {
	        value += advance();
	      }
	      if (state.brackets === 0) {
	        push({ type: "text", value });
	        continue;
	      }
	    }
	    if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
	      if (opts.posix !== false && value === ":") {
	        const inner = prev.value.slice(1);
	        if (inner.includes("[")) {
	          prev.posix = true;
	          if (inner.includes(":")) {
	            const idx = prev.value.lastIndexOf("[");
	            const pre = prev.value.slice(0, idx);
	            const rest2 = prev.value.slice(idx + 2);
	            const posix = POSIX_REGEX_SOURCE[rest2];
	            if (posix) {
	              prev.value = pre + posix;
	              state.backtrack = true;
	              advance();
	              if (!bos.output && tokens.indexOf(prev) === 1) {
	                bos.output = ONE_CHAR;
	              }
	              continue;
	            }
	          }
	        }
	      }
	      if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") {
	        value = `\\${value}`;
	      }
	      if (value === "]" && (prev.value === "[" || prev.value === "[^")) {
	        value = `\\${value}`;
	      }
	      if (opts.posix === true && value === "!" && prev.value === "[") {
	        value = "^";
	      }
	      prev.value += value;
	      append({ value });
	      continue;
	    }
	    if (state.quotes === 1 && value !== '"') {
	      value = utils.escapeRegex(value);
	      prev.value += value;
	      append({ value });
	      continue;
	    }
	    if (value === '"') {
	      state.quotes = state.quotes === 1 ? 0 : 1;
	      if (opts.keepQuotes === true) {
	        push({ type: "text", value });
	      }
	      continue;
	    }
	    if (value === "(") {
	      increment("parens");
	      push({ type: "paren", value });
	      continue;
	    }
	    if (value === ")") {
	      if (state.parens === 0 && opts.strictBrackets === true) {
	        throw new SyntaxError(syntaxError("opening", "("));
	      }
	      const extglob = extglobs[extglobs.length - 1];
	      if (extglob && state.parens === extglob.parens + 1) {
	        extglobClose(extglobs.pop());
	        continue;
	      }
	      push({ type: "paren", value, output: state.parens ? ")" : "\\)" });
	      decrement("parens");
	      continue;
	    }
	    if (value === "[") {
	      if (opts.nobracket === true || !remaining().includes("]")) {
	        if (opts.nobracket !== true && opts.strictBrackets === true) {
	          throw new SyntaxError(syntaxError("closing", "]"));
	        }
	        value = `\\${value}`;
	      } else {
	        increment("brackets");
	      }
	      push({ type: "bracket", value });
	      continue;
	    }
	    if (value === "]") {
	      if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
	        push({ type: "text", value, output: `\\${value}` });
	        continue;
	      }
	      if (state.brackets === 0) {
	        if (opts.strictBrackets === true) {
	          throw new SyntaxError(syntaxError("opening", "["));
	        }
	        push({ type: "text", value, output: `\\${value}` });
	        continue;
	      }
	      decrement("brackets");
	      const prevValue = prev.value.slice(1);
	      if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) {
	        value = `/${value}`;
	      }
	      prev.value += value;
	      append({ value });
	      if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) {
	        continue;
	      }
	      const escaped = utils.escapeRegex(prev.value);
	      state.output = state.output.slice(0, -prev.value.length);
	      if (opts.literalBrackets === true) {
	        state.output += escaped;
	        prev.value = escaped;
	        continue;
	      }
	      prev.value = `(${capture}${escaped}|${prev.value})`;
	      state.output += prev.value;
	      continue;
	    }
	    if (value === "{" && opts.nobrace !== true) {
	      increment("braces");
	      const open = {
	        type: "brace",
	        value,
	        output: "(",
	        outputIndex: state.output.length,
	        tokensIndex: state.tokens.length
	      };
	      braces.push(open);
	      push(open);
	      continue;
	    }
	    if (value === "}") {
	      const brace = braces[braces.length - 1];
	      if (opts.nobrace === true || !brace) {
	        push({ type: "text", value, output: value });
	        continue;
	      }
	      let output = ")";
	      if (brace.dots === true) {
	        const arr = tokens.slice();
	        const range = [];
	        for (let i = arr.length - 1; i >= 0; i--) {
	          tokens.pop();
	          if (arr[i].type === "brace") {
	            break;
	          }
	          if (arr[i].type !== "dots") {
	            range.unshift(arr[i].value);
	          }
	        }
	        output = expandRange(range, opts);
	        state.backtrack = true;
	      }
	      if (brace.comma !== true && brace.dots !== true) {
	        const out = state.output.slice(0, brace.outputIndex);
	        const toks = state.tokens.slice(brace.tokensIndex);
	        brace.value = brace.output = "\\{";
	        value = output = "\\}";
	        state.output = out;
	        for (const t of toks) {
	          state.output += t.output || t.value;
	        }
	      }
	      push({ type: "brace", value, output });
	      decrement("braces");
	      braces.pop();
	      continue;
	    }
	    if (value === "|") {
	      if (extglobs.length > 0) {
	        extglobs[extglobs.length - 1].conditions++;
	      }
	      push({ type: "text", value });
	      continue;
	    }
	    if (value === ",") {
	      let output = value;
	      const brace = braces[braces.length - 1];
	      if (brace && stack[stack.length - 1] === "braces") {
	        brace.comma = true;
	        output = "|";
	      }
	      push({ type: "comma", value, output });
	      continue;
	    }
	    if (value === "/") {
	      if (prev.type === "dot" && state.index === state.start + 1) {
	        state.start = state.index + 1;
	        state.consumed = "";
	        state.output = "";
	        tokens.pop();
	        prev = bos;
	        continue;
	      }
	      push({ type: "slash", value, output: SLASH_LITERAL });
	      continue;
	    }
	    if (value === ".") {
	      if (state.braces > 0 && prev.type === "dot") {
	        if (prev.value === ".") prev.output = DOT_LITERAL;
	        const brace = braces[braces.length - 1];
	        prev.type = "dots";
	        prev.output += value;
	        prev.value += value;
	        brace.dots = true;
	        continue;
	      }
	      if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
	        push({ type: "text", value, output: DOT_LITERAL });
	        continue;
	      }
	      push({ type: "dot", value, output: DOT_LITERAL });
	      continue;
	    }
	    if (value === "?") {
	      const isGroup = prev && prev.value === "(";
	      if (!isGroup && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
	        extglobOpen("qmark", value);
	        continue;
	      }
	      if (prev && prev.type === "paren") {
	        const next = peek();
	        let output = value;
	        if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) {
	          output = `\\${value}`;
	        }
	        push({ type: "text", value, output });
	        continue;
	      }
	      if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
	        push({ type: "qmark", value, output: QMARK_NO_DOT });
	        continue;
	      }
	      push({ type: "qmark", value, output: QMARK });
	      continue;
	    }
	    if (value === "!") {
	      if (opts.noextglob !== true && peek() === "(") {
	        if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
	          extglobOpen("negate", value);
	          continue;
	        }
	      }
	      if (opts.nonegate !== true && state.index === 0) {
	        negate();
	        continue;
	      }
	    }
	    if (value === "+") {
	      if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
	        extglobOpen("plus", value);
	        continue;
	      }
	      if (prev && prev.value === "(" || opts.regex === false) {
	        push({ type: "plus", value, output: PLUS_LITERAL });
	        continue;
	      }
	      if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
	        push({ type: "plus", value });
	        continue;
	      }
	      push({ type: "plus", value: PLUS_LITERAL });
	      continue;
	    }
	    if (value === "@") {
	      if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
	        push({ type: "at", extglob: true, value, output: "" });
	        continue;
	      }
	      push({ type: "text", value });
	      continue;
	    }
	    if (value !== "*") {
	      if (value === "$" || value === "^") {
	        value = `\\${value}`;
	      }
	      const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
	      if (match) {
	        value += match[0];
	        state.index += match[0].length;
	      }
	      push({ type: "text", value });
	      continue;
	    }
	    if (prev && (prev.type === "globstar" || prev.star === true)) {
	      prev.type = "star";
	      prev.star = true;
	      prev.value += value;
	      prev.output = star;
	      state.backtrack = true;
	      state.globstar = true;
	      consume(value);
	      continue;
	    }
	    let rest = remaining();
	    if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
	      extglobOpen("star", value);
	      continue;
	    }
	    if (prev.type === "star") {
	      if (opts.noglobstar === true) {
	        consume(value);
	        continue;
	      }
	      const prior = prev.prev;
	      const before = prior.prev;
	      const isStart = prior.type === "slash" || prior.type === "bos";
	      const afterStar = before && (before.type === "star" || before.type === "globstar");
	      if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
	        push({ type: "star", value, output: "" });
	        continue;
	      }
	      const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
	      const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
	      if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
	        push({ type: "star", value, output: "" });
	        continue;
	      }
	      while (rest.slice(0, 3) === "/**") {
	        const after = input[state.index + 4];
	        if (after && after !== "/") {
	          break;
	        }
	        rest = rest.slice(3);
	        consume("/**", 3);
	      }
	      if (prior.type === "bos" && eos()) {
	        prev.type = "globstar";
	        prev.value += value;
	        prev.output = globstar(opts);
	        state.output = prev.output;
	        state.globstar = true;
	        consume(value);
	        continue;
	      }
	      if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
	        state.output = state.output.slice(0, -(prior.output + prev.output).length);
	        prior.output = `(?:${prior.output}`;
	        prev.type = "globstar";
	        prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
	        prev.value += value;
	        state.globstar = true;
	        state.output += prior.output + prev.output;
	        consume(value);
	        continue;
	      }
	      if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
	        const end = rest[1] !== void 0 ? "|$" : "";
	        state.output = state.output.slice(0, -(prior.output + prev.output).length);
	        prior.output = `(?:${prior.output}`;
	        prev.type = "globstar";
	        prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
	        prev.value += value;
	        state.output += prior.output + prev.output;
	        state.globstar = true;
	        consume(value + advance());
	        push({ type: "slash", value: "/", output: "" });
	        continue;
	      }
	      if (prior.type === "bos" && rest[0] === "/") {
	        prev.type = "globstar";
	        prev.value += value;
	        prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
	        state.output = prev.output;
	        state.globstar = true;
	        consume(value + advance());
	        push({ type: "slash", value: "/", output: "" });
	        continue;
	      }
	      state.output = state.output.slice(0, -prev.output.length);
	      prev.type = "globstar";
	      prev.output = globstar(opts);
	      prev.value += value;
	      state.output += prev.output;
	      state.globstar = true;
	      consume(value);
	      continue;
	    }
	    const token = { type: "star", value, output: star };
	    if (opts.bash === true) {
	      token.output = ".*?";
	      if (prev.type === "bos" || prev.type === "slash") {
	        token.output = nodot + token.output;
	      }
	      push(token);
	      continue;
	    }
	    if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
	      token.output = value;
	      push(token);
	      continue;
	    }
	    if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
	      if (prev.type === "dot") {
	        state.output += NO_DOT_SLASH;
	        prev.output += NO_DOT_SLASH;
	      } else if (opts.dot === true) {
	        state.output += NO_DOTS_SLASH;
	        prev.output += NO_DOTS_SLASH;
	      } else {
	        state.output += nodot;
	        prev.output += nodot;
	      }
	      if (peek() !== "*") {
	        state.output += ONE_CHAR;
	        prev.output += ONE_CHAR;
	      }
	    }
	    push(token);
	  }
	  while (state.brackets > 0) {
	    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
	    state.output = utils.escapeLast(state.output, "[");
	    decrement("brackets");
	  }
	  while (state.parens > 0) {
	    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", ")"));
	    state.output = utils.escapeLast(state.output, "(");
	    decrement("parens");
	  }
	  while (state.braces > 0) {
	    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "}"));
	    state.output = utils.escapeLast(state.output, "{");
	    decrement("braces");
	  }
	  if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) {
	    push({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL}?` });
	  }
	  if (state.backtrack === true) {
	    state.output = "";
	    for (const token of state.tokens) {
	      state.output += token.output != null ? token.output : token.value;
	      if (token.suffix) {
	        state.output += token.suffix;
	      }
	    }
	  }
	  return state;
	};
	parse.fastpaths = (input, options) => {
	  const opts = { ...options };
	  const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
	  const len = input.length;
	  if (len > max) {
	    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
	  }
	  input = REPLACEMENTS[input] || input;
	  const {
	    DOT_LITERAL,
	    SLASH_LITERAL,
	    ONE_CHAR,
	    DOTS_SLASH,
	    NO_DOT,
	    NO_DOTS,
	    NO_DOTS_SLASH,
	    STAR,
	    START_ANCHOR
	  } = constants.globChars(opts.windows);
	  const nodot = opts.dot ? NO_DOTS : NO_DOT;
	  const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
	  const capture = opts.capture ? "" : "?:";
	  const state = { negated: false, prefix: "" };
	  let star = opts.bash === true ? ".*?" : STAR;
	  if (opts.capture) {
	    star = `(${star})`;
	  }
	  const globstar = (opts2) => {
	    if (opts2.noglobstar === true) return star;
	    return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
	  };
	  const create = (str) => {
	    switch (str) {
	      case "*":
	        return `${nodot}${ONE_CHAR}${star}`;
	      case ".*":
	        return `${DOT_LITERAL}${ONE_CHAR}${star}`;
	      case "*.*":
	        return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
	      case "*/*":
	        return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
	      case "**":
	        return nodot + globstar(opts);
	      case "**/*":
	        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
	      case "**/*.*":
	        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
	      case "**/.*":
	        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
	      default: {
	        const match = /^(.*?)\.(\w+)$/.exec(str);
	        if (!match) return;
	        const source2 = create(match[1]);
	        if (!source2) return;
	        return source2 + DOT_LITERAL + match[2];
	      }
	    }
	  };
	  const output = utils.removePrefix(input, state);
	  let source = create(output);
	  if (source && opts.strictSlashes !== true) {
	    source += `${SLASH_LITERAL}?`;
	  }
	  return source;
	};
	parse_1 = parse;
	return parse_1;
}

var picomatch_1$1;
var hasRequiredPicomatch$1;

function requirePicomatch$1 () {
	if (hasRequiredPicomatch$1) return picomatch_1$1;
	hasRequiredPicomatch$1 = 1;
	const scan = /*@__PURE__*/ requireScan();
	const parse = /*@__PURE__*/ requireParse();
	const utils = /*@__PURE__*/ requireUtils();
	const constants = /*@__PURE__*/ requireConstants();
	const isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
	const picomatch = (glob, options, returnState = false) => {
	  if (Array.isArray(glob)) {
	    const fns = glob.map((input) => picomatch(input, options, returnState));
	    const arrayMatcher = (str) => {
	      for (const isMatch of fns) {
	        const state2 = isMatch(str);
	        if (state2) return state2;
	      }
	      return false;
	    };
	    return arrayMatcher;
	  }
	  const isState = isObject(glob) && glob.tokens && glob.input;
	  if (glob === "" || typeof glob !== "string" && !isState) {
	    throw new TypeError("Expected pattern to be a non-empty string");
	  }
	  const opts = options || {};
	  const posix = opts.windows;
	  const regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, false, true);
	  const state = regex.state;
	  delete regex.state;
	  let isIgnored = () => false;
	  if (opts.ignore) {
	    const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
	    isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
	  }
	  const matcher = (input, returnObject = false) => {
	    const { isMatch, match, output } = picomatch.test(input, regex, options, { glob, posix });
	    const result = { glob, state, regex, posix, input, output, match, isMatch };
	    if (typeof opts.onResult === "function") {
	      opts.onResult(result);
	    }
	    if (isMatch === false) {
	      result.isMatch = false;
	      return returnObject ? result : false;
	    }
	    if (isIgnored(input)) {
	      if (typeof opts.onIgnore === "function") {
	        opts.onIgnore(result);
	      }
	      result.isMatch = false;
	      return returnObject ? result : false;
	    }
	    if (typeof opts.onMatch === "function") {
	      opts.onMatch(result);
	    }
	    return returnObject ? result : true;
	  };
	  if (returnState) {
	    matcher.state = state;
	  }
	  return matcher;
	};
	picomatch.test = (input, regex, options, { glob, posix } = {}) => {
	  if (typeof input !== "string") {
	    throw new TypeError("Expected input to be a string");
	  }
	  if (input === "") {
	    return { isMatch: false, output: "" };
	  }
	  const opts = options || {};
	  const format = opts.format || (posix ? utils.toPosixSlashes : null);
	  let match = input === glob;
	  let output = match && format ? format(input) : input;
	  if (match === false) {
	    output = format ? format(input) : input;
	    match = output === glob;
	  }
	  if (match === false || opts.capture === true) {
	    if (opts.matchBase === true || opts.basename === true) {
	      match = picomatch.matchBase(input, regex, options, posix);
	    } else {
	      match = regex.exec(output);
	    }
	  }
	  return { isMatch: Boolean(match), match, output };
	};
	picomatch.matchBase = (input, glob, options) => {
	  const regex = glob instanceof RegExp ? glob : picomatch.makeRe(glob, options);
	  return regex.test(utils.basename(input));
	};
	picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
	picomatch.parse = (pattern, options) => {
	  if (Array.isArray(pattern)) return pattern.map((p) => picomatch.parse(p, options));
	  return parse(pattern, { ...options, fastpaths: false });
	};
	picomatch.scan = (input, options) => scan(input, options);
	picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
	  if (returnOutput === true) {
	    return state.output;
	  }
	  const opts = options || {};
	  const prepend = opts.contains ? "" : "^";
	  const append = opts.contains ? "" : "$";
	  let source = `${prepend}(?:${state.output})${append}`;
	  if (state && state.negated === true) {
	    source = `^(?!${source}).*$`;
	  }
	  const regex = picomatch.toRegex(source, options);
	  if (returnState === true) {
	    regex.state = state;
	  }
	  return regex;
	};
	picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
	  if (!input || typeof input !== "string") {
	    throw new TypeError("Expected a non-empty string");
	  }
	  let parsed = { negated: false, fastpaths: true };
	  if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) {
	    parsed.output = parse.fastpaths(input, options);
	  }
	  if (!parsed.output) {
	    parsed = parse(input, options);
	  }
	  return picomatch.compileRe(parsed, options, returnOutput, returnState);
	};
	picomatch.toRegex = (source, options) => {
	  try {
	    const opts = options || {};
	    return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
	  } catch (err) {
	    if (options && options.debug === true) throw err;
	    return /$^/;
	  }
	};
	picomatch.constants = constants;
	picomatch_1$1 = picomatch;
	return picomatch_1$1;
}

var picomatch_1;
var hasRequiredPicomatch;

function requirePicomatch () {
	if (hasRequiredPicomatch) return picomatch_1;
	hasRequiredPicomatch = 1;
	const pico = /*@__PURE__*/ requirePicomatch$1();
	const utils = /*@__PURE__*/ requireUtils();
	function picomatch(glob, options, returnState = false) {
	  if (options && (options.windows === null || options.windows === void 0)) {
	    options = { ...options, windows: utils.isWindows() };
	  }
	  return pico(glob, options, returnState);
	}
	Object.assign(picomatch, pico);
	picomatch_1 = picomatch;
	return picomatch_1;
}

var picomatchExports = /*@__PURE__*/ requirePicomatch();
var picomatch = /*@__PURE__*/getDefaultExportFromCjs(picomatchExports);

const concurrentMap = async (items, concurrency, callback) => {
  const pending = /* @__PURE__ */ new Set();
  let index = 0;
  for await (const item of items) {
    const currentIndex = index;
    index += 1;
    const p = callback(item, currentIndex);
    pending.add(p);
    p.then(() => {
      pending.delete(p);
    }, () => {
    });
    if (pending.size >= concurrency) {
      await Promise.race(pending);
    }
  }
  await Promise.all(pending);
};

const glob = async (root, globPattern, options) => {
  const includeDot = options?.dot ?? false;
  const isMatch = picomatch(globPattern, { dot: includeDot });
  const isRecursive = globPattern.includes("**");
  const results = [];
  const rootPrefix = root.length + 1;
  const crawl = async (directory) => {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const subdirectories = [];
    for (const entry of entries) {
      const fullPath = `${directory}/${entry.name}`;
      const relativePath = fullPath.slice(rootPrefix);
      if (isMatch(relativePath)) {
        results.push(fullPath);
        continue;
      }
      if (entry.isDirectory() && isRecursive) {
        if (!includeDot && entry.name.startsWith(".")) {
          continue;
        }
        subdirectories.push(crawl(fullPath));
      }
    }
    await Promise.all(subdirectories);
  };
  await crawl(root);
  return results;
};

const debug$2 = createDebug("poof:resolve");
const toPosix = path.sep === "\\" ? (filePath) => filePath.replaceAll("\\", "/") : (filePath) => filePath;
const GLOB_CONCURRENCY = 50;
const validatePath = (target, cwd, dangerous) => {
  const absoluteTarget = path.resolve(target);
  const { root } = path.parse(absoluteTarget);
  if (absoluteTarget === root) {
    throw new Error(`Refusing to delete root directory: ${absoluteTarget}`);
  }
  if (!dangerous) {
    const normalizedCwd = toPosix(path.resolve(cwd));
    const normalizedTarget = toPosix(absoluteTarget);
    const isOutside = !normalizedTarget.startsWith(`${normalizedCwd}/`) && normalizedTarget !== normalizedCwd;
    if (isOutside) {
      throw new Error(
        `Refusing to delete path outside cwd. Pass { dangerous: true } to allow: ${absoluteTarget}`
      );
    }
  }
};
const resolvePatterns = async (patterns, cwd, dangerous = false) => {
  const files = [];
  const notFound = [];
  await concurrentMap(patterns, GLOB_CONCURRENCY, async (pattern) => {
    const posixPattern = toPosix(pattern);
    const fullPattern = path.isAbsolute(pattern) ? posixPattern : path.posix.join(toPosix(cwd), posixPattern);
    const scanned = picomatch.scan(fullPattern);
    debug$2("pattern %s -> fullPattern %s (isGlob: %s)", pattern, fullPattern, scanned.isGlob);
    const pathToValidate = scanned.isGlob ? scanned.base || cwd : fullPattern;
    validatePath(pathToValidate, cwd, dangerous);
    if (!scanned.isGlob) {
      await fs.access(fullPattern).then(
        () => {
          debug$2("explicit path exists: %s", fullPattern);
          files.push(fullPattern);
        },
        () => {
          debug$2("explicit path not found: %s", pattern);
          notFound.push(pattern);
        }
      );
      return;
    }
    let root = scanned.base || toPosix(cwd);
    if (root.endsWith("/")) {
      root = root.slice(0, -1);
    }
    const descendIntoDotDirectories = /^\.[^\\/.]|[{,]\.[^\\/.]/.test(scanned.glob);
    const globStart = performance.now();
    const matches = await glob(root, scanned.glob, { dot: descendIntoDotDirectories });
    debug$2("glob pattern=%s files=%d time=%sms", pattern, matches.length, (performance.now() - globStart).toFixed(2));
    for (const match of matches) {
      files.push(match);
    }
  });
  return {
    files,
    notFound
  };
};

const debug$1 = createDebug("poof:rm");
const rmWorkerPath = fileURLToPath(import.meta.resolve("#rm-worker"));
const startRmWorker = () => {
  debug$1("spawning background rm process: %s", rmWorkerPath);
  const child = spawn(process.execPath, [rmWorkerPath], {
    detached: true,
    stdio: ["pipe", "ignore", "ignore"],
    windowsHide: true
  });
  const stdin = child.stdin;
  child.unref();
  debug$1("background rm process started (pid: %d)", child.pid);
  return {
    /**
     * Stream path to child process (null-delimited for filenames with newlines).
     *
     * Backpressure handling is critical here for three reasons:
     * 1. Instant exit: Without it, end() blocks until child consumes the ~64KB pipe buffer,
     *    causing the CLI to hang at exit instead of returning instantly.
     * 2. Data safety: We only rename files at the pace we can communicate to the cleaner.
     *    If parent crashes, orphaned temp files are limited to what's in the pipe, not
     *    unbounded paths sitting in Node.js memory.
     * 3. Memory: Large directories (monorepo node_modules) can have 500k+ files.
     *    Buffering all paths in memory risks OOM in constrained environments.
     */
    write(filePath) {
      debug$1("queue for deletion: %s", filePath);
      const canContinue = stdin.write(`${filePath}\0`);
      if (!canContinue) {
        debug$1("backpressure - waiting for drain");
        return new Promise((resolve) => {
          stdin.once("drain", resolve);
        });
      }
    },
    /**
     * Signal end of paths and wait for buffer to flush to OS pipe.
     * After this resolves, all paths are in the kernel pipe buffer and the
     * detached child will continue cleanup even after parent exits.
     */
    end: () => new Promise((resolve, reject) => {
      debug$1("ending stdin stream");
      stdin.end(
        (error) => error ? reject(error) : resolve()
      );
    })
  };
};

const RETRY_COUNT = 3;
const isWindows = process.platform === "win32";
const windowsLockingCodes = /* @__PURE__ */ new Set(["EBUSY", "EPERM"]);
const isWindowsLockingError = (error) => isWindows && windowsLockingCodes.has(error.code ?? "");
const withRetry = async (operation, shouldRetry) => {
  let lastError;
  for (let attempt = 0; attempt < RETRY_COUNT; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_COUNT - 1 && shouldRetry(error)) {
        await setTimeout(100 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const debug = createDebug("poof:rename");
const RENAME_CONCURRENCY = 100;
const poof = async (patterns, options) => {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  const cwd = options?.cwd ?? process.cwd();
  debug("patterns: %o, cwd: %s", patternArray, cwd);
  const resolveStart = performance.now();
  const { files, notFound } = await resolvePatterns(patternArray, cwd, options?.dangerous ?? false);
  debug("resolve files=%d time=%sms", files.length, (performance.now() - resolveStart).toFixed(2));
  const filesToDelete = files;
  const errors = notFound.map((pattern) => {
    const error = new Error(`Path not found: ${pattern}`);
    error.code = "ENOENT";
    return {
      path: pattern,
      error
    };
  });
  if (options?.dry) {
    return {
      deleted: files,
      errors
    };
  }
  const deleted = [];
  if (filesToDelete.length > 0) {
    const renameStart = performance.now();
    const id = `poof-${crypto.randomUUID()}`;
    const tempDir = path.join(os.tmpdir(), id);
    let tempDirCreated;
    const rmWriter = startRmWorker();
    const renamedParents = [];
    await concurrentMap(filesToDelete, RENAME_CONCURRENCY, async (target, index) => {
      const baseName = path.basename(target);
      if (!tempDirCreated) {
        tempDirCreated = fs.mkdir(tempDir).then(() => {
          debug("temp dir created: %s", tempDir);
        });
      }
      await tempDirCreated;
      const destinationPath = path.join(tempDir, `${index}-${baseName}`);
      debug("rename %s -> %s", target, destinationPath);
      try {
        await withRetry(() => fs.rename(target, destinationPath), isWindowsLockingError);
        renamedParents.push(target);
        return;
      } catch (error) {
        const { code } = error;
        debug("rename failed: %s (code=%s)", target, code);
        if (code === "ENOENT") {
          renamedParents.push(target);
          return;
        }
        if (code !== "EXDEV") {
          errors.push({
            path: target,
            error
          });
          return;
        }
      }
      const fallbackPath = path.join(path.dirname(target), `.${id}-${index}-${baseName}`);
      try {
        await withRetry(() => fs.rename(target, fallbackPath), isWindowsLockingError);
        await rmWriter.write(fallbackPath);
        renamedParents.push(target);
      } catch (fallbackError) {
        const { code } = fallbackError;
        if (code === "ENOENT") {
          renamedParents.push(target);
          return;
        }
        errors.push({
          path: target,
          error: fallbackError
        });
      }
    });
    debug("rename files=%d time=%sms", renamedParents.length, (performance.now() - renameStart).toFixed(2));
    const spawnStart = performance.now();
    if (tempDirCreated) {
      await rmWriter.write(tempDir);
    }
    await rmWriter.end();
    debug("spawn time=%sms", (performance.now() - spawnStart).toFixed(2));
    const renamedSet = new Set(renamedParents);
    for (const file of files) {
      if (renamedSet.has(file)) {
        deleted.push(file);
        continue;
      }
      let dir = file;
      while (dir.includes("/")) {
        dir = dir.slice(0, Math.max(0, dir.lastIndexOf("/")));
        if (renamedSet.has(dir)) {
          deleted.push(file);
          break;
        }
      }
    }
  }
  debug("deleted %d files, %d errors", deleted.length, errors.length);
  return {
    deleted,
    errors
  };
};

export { poof as default };
