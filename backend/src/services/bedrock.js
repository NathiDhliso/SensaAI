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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bedrockService = void 0;
var client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
var uuid_1 = require("uuid");
// In-memory job store (use Redis/BullMQ in production)
var jobs = new Map();
var abortControllers = new Map();
// Bedrock client
var bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
var BedrockService = /** @class */ (function () {
    function BedrockService() {
    }
    BedrockService.prototype.startGeneration = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var jobId, job;
            return __generator(this, function (_a) {
                jobId = (0, uuid_1.v4)();
                job = {
                    id: jobId,
                    userId: request.userId,
                    subject: request.subject,
                    status: 'queued',
                    content: '',
                    createdAt: new Date(),
                };
                jobs.set(jobId, job);
                // Start generation in background
                this.processGeneration(jobId, request).catch(function (error) {
                    var existingJob = jobs.get(jobId);
                    if (existingJob) {
                        existingJob.status = 'failed';
                        existingJob.error = error.message;
                    }
                });
                return [2 /*return*/, jobId];
            });
        });
    };
    BedrockService.prototype.streamGeneration = function (jobId) {
        return __asyncGenerator(this, arguments, function streamGeneration_1() {
            var job, lastContentLength;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        job = jobs.get(jobId);
                        if (!!job) return [3 /*break*/, 4];
                        return [4 /*yield*/, __await({ error: 'Job not found' })];
                    case 1: return [4 /*yield*/, _a.sent()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, __await(void 0)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        if (!(job.status === 'queued')) return [3 /*break*/, 8];
                        return [4 /*yield*/, __await({ status: 'waiting' })];
                    case 5: return [4 /*yield*/, _a.sent()];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, __await(new Promise(function (resolve) { return setTimeout(resolve, 100); }))];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 8:
                        lastContentLength = 0;
                        _a.label = 9;
                    case 9:
                        if (!(job.status === 'running')) return [3 /*break*/, 14];
                        if (!(job.content.length > lastContentLength)) return [3 /*break*/, 12];
                        return [4 /*yield*/, __await({ content: job.content.slice(lastContentLength) })];
                    case 10: return [4 /*yield*/, _a.sent()];
                    case 11:
                        _a.sent();
                        lastContentLength = job.content.length;
                        _a.label = 12;
                    case 12: return [4 /*yield*/, __await(new Promise(function (resolve) { return setTimeout(resolve, 50); }))];
                    case 13:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 14:
                        if (!(job.content.length > lastContentLength)) return [3 /*break*/, 17];
                        return [4 /*yield*/, __await({ content: job.content.slice(lastContentLength) })];
                    case 15: return [4 /*yield*/, _a.sent()];
                    case 16:
                        _a.sent();
                        _a.label = 17;
                    case 17: return [4 /*yield*/, __await({ status: job.status, done: true })];
                    case 18: return [4 /*yield*/, _a.sent()];
                    case 19:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    BedrockService.prototype.getStatus = function (jobId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, jobs.get(jobId) || null];
            });
        });
    };
    BedrockService.prototype.cancelGeneration = function (jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var controller, job;
            return __generator(this, function (_a) {
                controller = abortControllers.get(jobId);
                if (controller) {
                    controller.abort();
                }
                job = jobs.get(jobId);
                if (job) {
                    job.status = 'cancelled';
                }
                return [2 /*return*/];
            });
        });
    };
    BedrockService.prototype.processGeneration = function (jobId, request) {
        return __awaiter(this, void 0, void 0, function () {
            var job, controller, systemPrompt, payload, command, response, _a, _b, _c, event_1, chunk, e_1_1, error_1;
            var _d, e_1, _e, _f;
            var _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        job = jobs.get(jobId);
                        if (!job)
                            return [2 /*return*/];
                        job.status = 'running';
                        controller = new AbortController();
                        abortControllers.set(jobId, controller);
                        _h.label = 1;
                    case 1:
                        _h.trys.push([1, 15, 16, 17]);
                        systemPrompt = request.systemPrompt || this.getDefaultSystemPrompt();
                        payload = {
                            anthropic_version: 'bedrock-2023-05-31',
                            max_tokens: 64000,
                            system: systemPrompt,
                            messages: [
                                {
                                    role: 'user',
                                    content: "Generate comprehensive study material for: ".concat(request.subject),
                                },
                            ],
                        };
                        command = new client_bedrock_runtime_1.InvokeModelWithResponseStreamCommand({
                            modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
                            contentType: 'application/json',
                            accept: 'application/json',
                            body: JSON.stringify(payload),
                        });
                        return [4 /*yield*/, bedrockClient.send(command, {
                                abortSignal: controller.signal,
                            })];
                    case 2:
                        response = _h.sent();
                        if (!response.body) {
                            throw new Error('No response body from Bedrock');
                        }
                        _h.label = 3;
                    case 3:
                        _h.trys.push([3, 8, 9, 14]);
                        _a = true, _b = __asyncValues(response.body);
                        _h.label = 4;
                    case 4: return [4 /*yield*/, _b.next()];
                    case 5:
                        if (!(_c = _h.sent(), _d = _c.done, !_d)) return [3 /*break*/, 7];
                        _f = _c.value;
                        _a = false;
                        event_1 = _f;
                        if (controller.signal.aborted) {
                            return [3 /*break*/, 7];
                        }
                        if (event_1.chunk) {
                            chunk = JSON.parse(new TextDecoder().decode(event_1.chunk.bytes));
                            if (chunk.type === 'content_block_delta' && ((_g = chunk.delta) === null || _g === void 0 ? void 0 : _g.type) === 'text_delta') {
                                job.content += chunk.delta.text;
                            }
                        }
                        _h.label = 6;
                    case 6:
                        _a = true;
                        return [3 /*break*/, 4];
                    case 7: return [3 /*break*/, 14];
                    case 8:
                        e_1_1 = _h.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 14];
                    case 9:
                        _h.trys.push([9, , 12, 13]);
                        if (!(!_a && !_d && (_e = _b.return))) return [3 /*break*/, 11];
                        return [4 /*yield*/, _e.call(_b)];
                    case 10:
                        _h.sent();
                        _h.label = 11;
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 13: return [7 /*endfinally*/];
                    case 14:
                        job.status = 'completed';
                        job.completedAt = new Date();
                        return [3 /*break*/, 17];
                    case 15:
                        error_1 = _h.sent();
                        if (job.status !== 'cancelled') {
                            job.status = 'failed';
                            job.error = error_1 instanceof Error ? error_1.message : 'Unknown error';
                        }
                        return [3 /*break*/, 17];
                    case 16:
                        abortControllers.delete(jobId);
                        return [7 /*endfinally*/];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    BedrockService.prototype.getDefaultSystemPrompt = function () {
        return "You are an expert educator creating comprehensive study materials.\nGenerate structured learning content with clear explanations, examples, and practice questions.\nUse markdown formatting for readability.";
    };
    return BedrockService;
}());
exports.bedrockService = new BedrockService();
