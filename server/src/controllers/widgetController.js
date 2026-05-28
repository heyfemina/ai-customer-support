import crypto from "crypto";
import prisma from "../config/prisma.js";
import { generateSupportReply } from "../services/aiService.js";
import { encryptMessageContent, decryptMessageContent } from "../utils/messageCrypto.js";
import { success } from "../utils/responseHandler.js";

function originDomain(req) {
  try {
    return new URL(req.headers.origin || req.body.domain || req.body.pageUrl || "http://localhost").hostname;
  } catch {
    return req.body.domain || "unknown";
  }
}

async function checkDomain(req, res) {
  const setting = await prisma.integrationSetting.findUnique({ where: { type: "chatbot" } });
  const allowed = String(setting?.config?.allowedDomains || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!allowed.length) return true;
  const domain = originDomain(req);
  const ok = allowed.some((allowedDomain) => domain === allowedDomain || domain.endsWith(`.${allowedDomain}`));
  if (!ok) res.status(403).json({ success: false, message: "Widget domain is not allowed" });
  return ok;
}

function shapeMessage(message) {
  return { ...message, content: decryptMessageContent(message.content) };
}

async function getVisitorUser(visitorId) {
  const email = `visitor-${visitorId}@widget.local`;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      name: "Website Visitor",
      email,
      password: crypto.randomBytes(24).toString("hex"),
      role: "CUSTOMER",
    },
  });
}

export async function widgetScript(req, res) {
  const apiBase = `${req.protocol}://${req.get("host")}`;
  res.type("application/javascript").send(`
(function(){
  var script=document.currentScript; var widgetId=script.getAttribute('data-widget-id')||'default';
  var apiBase='${apiBase}'; var visitorId=localStorage.getItem('acsVisitorId')||Math.random().toString(36).slice(2)+Date.now();
  localStorage.setItem('acsVisitorId', visitorId);
  var root=document.createElement('div'); root.style.cssText='position:fixed;right:18px;bottom:18px;z-index:999999;font-family:Arial,sans-serif';
  root.innerHTML='<button id="acs-bubble" style="height:54px;width:54px;border-radius:50%;border:0;background:#0284c7;color:white;font-weight:700;box-shadow:0 8px 24px #0003">Chat</button><div id="acs-panel" style="display:none;width:320px;height:430px;background:white;border:1px solid #dbe3ea;border-radius:10px;box-shadow:0 14px 40px #0002;overflow:hidden"><div style="background:#0284c7;color:white;padding:12px;font-weight:700">Support Chat</div><div id="acs-log" style="height:310px;overflow:auto;padding:10px;font-size:13px"></div><form id="acs-form" style="display:flex;gap:6px;padding:10px;border-top:1px solid #e5e7eb"><input id="acs-input" style="flex:1;border:1px solid #cbd5e1;border-radius:6px;padding:8px" placeholder="Type a message"/><button style="background:#0284c7;color:white;border:0;border-radius:6px;padding:8px">Send</button></form></div>';
  document.body.appendChild(root);
  var sessionId=null, log=root.querySelector('#acs-log'), panel=root.querySelector('#acs-panel');
  function add(who,text){var p=document.createElement('p');p.innerHTML='<b>'+who+':</b> '+text;log.appendChild(p);log.scrollTop=log.scrollHeight;}
  async function session(){ if(sessionId) return sessionId; var r=await fetch(apiBase+'/api/widget/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({widgetId:widgetId,visitorId:visitorId,domain:location.hostname,pageUrl:location.href,referrer:document.referrer,userAgent:navigator.userAgent})}); var j=await r.json(); sessionId=j.data.id; add('AI','Hi, how can we help?'); return sessionId; }
  root.querySelector('#acs-bubble').onclick=function(){panel.style.display=panel.style.display==='none'?'block':'none'; session();};
  root.querySelector('#acs-form').onsubmit=async function(e){e.preventDefault(); var input=root.querySelector('#acs-input'); var text=input.value.trim(); if(!text)return; input.value=''; add('You',text); add('AI','Typing...'); var sid=await session(); var r=await fetch(apiBase+'/api/widget/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sid,visitorId:visitorId,message:text})}); var j=await r.json(); log.lastChild.remove(); add('AI',j.data.aiMessage.content);};
})();`);
}

export async function createWidgetSession(req, res, next) {
  try {
    if (!(await checkDomain(req, res))) return;
    const visitorId = req.body.visitorId || crypto.randomBytes(12).toString("hex");
    const user = await getVisitorUser(visitorId);
    const chat = await prisma.chatSession.create({
      data: {
        customerId: user.id,
        channel: "Website widget",
        widgetId: req.body.widgetId || "default",
        visitorId,
        visitorDomain: req.body.domain || originDomain(req),
        visitorPage: req.body.pageUrl,
        visitorDevice: req.body.userAgent || req.headers["user-agent"],
        visitorReferrer: req.body.referrer,
        visitorIp: req.ip,
      },
    });
    success(res, chat, "Widget session created", 201);
  } catch (error) { next(error); }
}

export async function sendWidgetMessage(req, res, next) {
  try {
    if (!(await checkDomain(req, res))) return;
    const chat = await prisma.chatSession.findUnique({ where: { id: req.body.sessionId }, include: { customer: true } });
    if (!chat || chat.visitorId !== req.body.visitorId) return res.status(403).json({ success: false, message: "Invalid widget session" });
    const content = req.body.message || "";
    const message = await prisma.message.create({ data: { content: encryptMessageContent(content), originalContent: content, senderId: chat.customerId, chatSessionId: chat.id } });
    const ai = await generateSupportReply(content, { language: chat.language, customerName: "Website Visitor", userId: chat.customerId });
    const aiMessage = await prisma.message.create({ data: { content: encryptMessageContent(ai.reply), originalContent: ai.reply, senderId: chat.customerId, chatSessionId: chat.id, isAI: true } });
    await prisma.chatSession.update({ where: { id: chat.id }, data: { lastMessage: ai.reply, status: ai.transferToAgent ? "TRANSFERRED" : "ACTIVE" } });
    req.app.get("io")?.emit("chat_queue_updated", chat);
    success(res, { message: shapeMessage(message), aiMessage: shapeMessage(aiMessage), transferToAgent: ai.transferToAgent }, "Message sent");
  } catch (error) { next(error); }
}

export async function getWidgetMessages(req, res, next) {
  try {
    const messages = await prisma.message.findMany({ where: { chatSessionId: req.params.sessionId }, orderBy: { createdAt: "asc" } });
    success(res, messages.map(shapeMessage));
  } catch (error) { next(error); }
}
