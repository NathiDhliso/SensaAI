"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generationRouter = void 0;
var express_1 = require("express");
var bedrock_js_1 = require("../services/bedrock.js");
exports.generationRouter = (0, express_1.Router)();
// Start a new generation
exports.generationRouter.post('/start', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, subject, systemPrompt, domain, userId, jobId, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = req.body, subject = _a.subject, systemPrompt = _a.systemPrompt, domain = _a.domain;
                userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.sub;
                if (!subject) {
                    res.status(400).json({ error: 'Subject is required' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, bedrock_js_1.bedrockService.startGeneration({
                        userId: userId || 'anonymous',
                        subject: subject,
                        systemPrompt: systemPrompt,
                        domain: domain,
                    })];
            case 1:
                jobId = _c.sent();
                res.json({ jobId: jobId, status: 'queued' });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _c.sent();
                console.error('Generation start error:', error_1);
                res.status(500).json({ error: 'Failed to start generation' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Stream generation progress
exports.generationRouter.get('/stream/:jobId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var jobId, generator, _a, generator_1, generator_1_1, chunk, e_1_1, error_2;
    var _b, e_1, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 13, , 14]);
                jobId = req.params.jobId;
                // Set up SSE
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('X-Accel-Buffering', 'no');
                generator = bedrock_js_1.bedrockService.streamGeneration(jobId);
                _e.label = 1;
            case 1:
                _e.trys.push([1, 6, 7, 12]);
                _a = true, generator_1 = __asyncValues(generator);
                _e.label = 2;
            case 2: return [4 /*yield*/, generator_1.next()];
            case 3:
                if (!(generator_1_1 = _e.sent(), _b = generator_1_1.done, !_b)) return [3 /*break*/, 5];
                _d = generator_1_1.value;
                _a = false;
                chunk = _d;
                res.write("data: ".concat(JSON.stringify(chunk), "\n\n"));
                if (chunk.done)
                    return [3 /*break*/, 5];
                _e.label = 4;
            case 4:
                _a = true;
                return [3 /*break*/, 2];
            case 5: return [3 /*break*/, 12];
            case 6:
                e_1_1 = _e.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 12];
            case 7:
                _e.trys.push([7, , 10, 11]);
                if (!(!_a && !_b && (_c = generator_1.return))) return [3 /*break*/, 9];
                return [4 /*yield*/, _c.call(generator_1)];
            case 8:
                _e.sent();
                _e.label = 9;
            case 9: return [3 /*break*/, 11];
            case 10:
                if (e_1) throw e_1.error;
                return [7 /*endfinally*/];
            case 11: return [7 /*endfinally*/];
            case 12:
                res.end();
                return [3 /*break*/, 14];
            case 13:
                error_2 = _e.sent();
                console.error('Stream error:', error_2);
                res.write("data: ".concat(JSON.stringify({ error: 'Stream failed' }), "\n\n"));
                res.end();
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/];
        }
    });
}); });
// Get generation status
exports.generationRouter.get('/:jobId/status', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var jobId, status_1, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                jobId = req.params.jobId;
                return [4 /*yield*/, bedrock_js_1.bedrockService.getStatus(jobId)];
            case 1:
                status_1 = _a.sent();
                if (!status_1) {
                    res.status(404).json({ error: 'Job not found' });
                    return [2 /*return*/];
                }
                res.json(status_1);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('Status error:', error_3);
                res.status(500).json({ error: 'Failed to get status' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Cancel generation
exports.generationRouter.post('/:jobId/cancel', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var jobId, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                jobId = req.params.jobId;
                return [4 /*yield*/, bedrock_js_1.bedrockService.cancelGeneration(jobId)];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('Cancel error:', error_4);
                res.status(500).json({ error: 'Failed to cancel generation' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
