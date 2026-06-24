-- 外贸英语工作台 · seed data
-- Run after supabase/schema.sql. Built-in rows use user_id = NULL.

insert into public.templates (user_id, category, title, content_en, content_zh) values
  (null, 'email_opening', '首次联系', 'I am writing to inquire about...', '写信询问……'),
  (null, 'email_opening', '首次联系', 'I am writing with regard to...', '关于……特此来函'),
  (null, 'email_opening', '回复', 'Thank you for your email.', '感谢来信'),
  (null, 'email_opening', '回复', 'Thank you for getting back to me so quickly.', '感谢您这么快回复'),
  (null, 'email_opening', '跟进', 'I am following up on my previous email regarding...', '跟进我之前关于……的邮件'),
  (null, 'email_opening', '跟进', 'Further to our conversation last week, ...', '承上周交谈，……'),
  (null, 'email_opening', '寒暄', 'I hope this email finds you well.', '顺祝商祺'),
  (null, 'email_body', '请求', 'Could you please send us...?', '能否请您发给我们……？'),
  (null, 'email_body', '请求', 'I would appreciate it if you could...', '如蒙……不胜感激'),
  (null, 'email_body', '请求', 'Would it be possible to...?', '是否有可能……？'),
  (null, 'email_body', '告知', 'I am pleased to inform you that...', '很高兴通知您……'),
  (null, 'email_body', '附件', 'Please find attached...', '附件为……'),
  (null, 'email_body', '道歉', 'I apologize for the delay in responding.', '抱歉回复迟了'),
  (null, 'email_body', '确认', 'This is to confirm that...', '兹确认……'),
  (null, 'email_body', '催促', 'I would appreciate an update on... when you get a chance.', '方便时望告知……进展'),
  (null, 'email_closing', '—', 'I look forward to hearing from you.', '期待您的回复'),
  (null, 'email_closing', '—', 'Please let me know if you need any further information.', '如需更多信息请告知'),
  (null, 'email_closing', '—', 'Should you have any questions, please don''t hesitate to contact me.', '如有疑问请随时联系我'),
  (null, 'interpreting', '迎接', 'Welcome to our company. I''m [name], assistant to our Chairman.', '欢迎光临，我是董事长助理……'),
  (null, 'interpreting', '寒暄', 'How was your flight? I hope you had a smooth journey.', '旅途还顺利吧？'),
  (null, 'interpreting', '救场', 'That''s a good question. Let me check and get back to you.', '好问题，我确认后回复您'),
  (null, 'interpreting', '请放慢', 'Could you slow down a little, please?', '能否请您说慢一点？'),
  (null, 'interpreting', '澄清', 'Just to clarify, do you mean...?', '我确认一下，您是指……？'),
  (null, 'interpreting', '送别', 'It''s been a pleasure having you here. Have a safe trip back.', '很高兴接待您，一路平安'),
  (null, 'meeting', '开场', 'The purpose of today''s meeting is to...', '今天会议的目的是……'),
  (null, 'meeting', '推进', 'Let''s move on to the next item on the agenda.', '进入下一项议程'),
  (null, 'meeting', '征求意见', 'What are your thoughts on this?', '您怎么看？'),
  (null, 'meeting', '控场', 'That''s an interesting point, but let''s table it for now.', '这点很有意思，先放一放'),
  (null, 'meeting', '收尾', 'So, to sum up, we''ve agreed to...', '总结一下，我们达成一致……'),
  (null, 'contract', 'Entire Agreement', 'This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, whether written or oral.', '完整协议条款'),
  (null, 'contract', 'Governing Law', 'This Agreement shall be governed by the laws of...', '适用法律'),
  (null, 'contract', 'Assignment', 'Neither party may assign this Agreement without the prior written consent of the other party.', '未经书面同意不得转让'),
  (null, 'contract', 'Force Majeure', 'Neither party shall be liable for failure caused by events beyond its reasonable control.', '不可抗力免责'),
  (null, 'fair', '接待', 'Welcome to our booth. Are you looking for anything specific?', '欢迎光临展位'),
  (null, 'fair', '介绍', 'Our main product lines are tiles, flooring, sanitary ware, and cabinets.', '主营瓷砖、地板、卫浴、橱柜'),
  (null, 'fair', '报价', 'Our MOQ is 500 pieces, and the lead time is about 30 days.', '起订量 500 件，交期约 30 天'),
  (null, 'fair', '报价', 'This price is based on FOB Shanghai; shipping and insurance would be extra.', '此价为 FOB 上海，运费保险另计'),
  (null, 'fair', '展后跟进', 'It was great meeting you at the Canton Fair. As promised, please find attached our quotation.', '展后跟进'),
  (null, 'speech', '路线图', 'Today, I''d like to talk about three things...', '今天我想讲三点'),
  (null, 'speech', '推进', 'This brings me to my next point...', '引出下一点'),
  (null, 'speech', '讲图表', 'As you can see here... / Let me walk you through this chart.', '如图所示'),
  (null, 'speech', '强调', 'The key point here is...', '关键是'),
  (null, 'speech', '收尾', 'To sum up, ... / The key takeaway is...', '总结')
on conflict do nothing;

insert into public.glossary (user_id, category, term_en, term_zh, example) values
  (null, 'trade', 'EXW', 'Ex Works 工厂交货', '卖方责任最小'),
  (null, 'trade', 'FCA', 'Free Carrier 货交承运人', '集装箱推荐'),
  (null, 'trade', 'FOB', 'Free on Board 船上交货', '风险装船时转移'),
  (null, 'trade', 'CFR', 'Cost and Freight 成本加运费', null),
  (null, 'trade', 'CIF', 'Cost, Insurance and Freight 成本保险加运费', '卖方付运费保险至目的港、风险仍在装运港转移'),
  (null, 'trade', 'DDP', 'Delivered Duty Paid 完税后交货', '卖方责任最大'),
  (null, 'trade', 'MOQ', 'Minimum Order Quantity 最小起订量', null),
  (null, 'trade', 'Lead time', '交货周期', null),
  (null, 'trade', 'T/T', 'Telegraphic Transfer 电汇', null),
  (null, 'trade', 'L/C', 'Letter of Credit 信用证', null),
  (null, 'trade', 'D/P', 'Documents against Payment 付款交单', null),
  (null, 'trade', 'Proforma Invoice', '形式发票', null),
  (null, 'trade', 'PO', 'Purchase Order 采购订单', null),
  (null, 'trade', 'B/L', 'Bill of Lading 提单', null),
  (null, 'trade', 'HS Code', '海关编码', null),
  (null, 'product', 'tiles', '瓷砖', null),
  (null, 'product', 'porcelain tile', '瓷质砖', null),
  (null, 'product', 'flooring', '地板', null),
  (null, 'product', 'hardwood flooring', '实木地板', null),
  (null, 'product', 'laminate', '强化地板/层压板', null),
  (null, 'product', 'sanitary ware', '卫浴', null),
  (null, 'product', 'faucet', '水龙头', null),
  (null, 'product', 'vanity', '浴室柜', null),
  (null, 'product', 'countertop', '台面', null),
  (null, 'product', 'quartz countertop', '石英石台面', null),
  (null, 'product', 'cabinet', '橱柜', null),
  (null, 'product', 'backsplash', '厨房挡水板', null),
  (null, 'renovation', 'renovation', '翻新', null),
  (null, 'renovation', 'remodel', '改造', null),
  (null, 'renovation', 'fixtures', '固定装置', null),
  (null, 'renovation', 'grout', '填缝剂', null),
  (null, 'renovation', 'caulking', '密封胶', null),
  (null, 'renovation', 'subfloor', '垫层地板', null),
  (null, 'renovation', 'waterproofing membrane', '防水膜', null),
  (null, 'renovation', 'insulation', '隔热/保温', null),
  (null, 'renovation', 'veneer', '饰面', null),
  (null, 'contract', 'Indemnity', '赔偿', null),
  (null, 'contract', 'Warranty', '保证', null),
  (null, 'contract', 'Confidentiality', '保密', null),
  (null, 'contract', 'Termination', '终止', null),
  (null, 'contract', 'Severability', '可分割性', null),
  (null, 'contract', 'Arbitration', '仲裁', null),
  (null, 'contract', 'Notice', '通知', null)
on conflict do nothing;

insert into public.grammar_points (slug, name_zh, priority, rules_md, examples, common_mistakes) values
  ('modal', '情态动词与礼貌语气', 1, '礼貌梯度 Can you → Could you → Would you → Would you mind…（越委婉越礼貌）。could/would/may 表委婉请求；should 建议；must 强制义务；shall 在合同表义务。模态动词后必须接动词原形。',
   '[{"en":"Could you send me the report by today, please?","zh":"委婉请求"},{"en":"Would you mind sending the samples?","zh":"很客气的请求"}]'::jsonb,
   '[{"wrong":"He can to play","right":"He can play"},{"wrong":"I need the report today（生硬）","right":"Could you send me the report by today, please?（委婉）"}]'::jsonb),
  ('tense', '时态', 2, '一般过去（具体时间）vs 现在完成（强调结果/影响）。注意不规则动词，如 lead→led。',
   '[{"en":"We finalized the budget last Tuesday.","zh":"具体时间用过去式"},{"en":"We have completed the report.","zh":"强调结果"}]'::jsonb,
   '[{"wrong":"We have finalized the budget last Tuesday","right":"We finalized the budget last Tuesday"}]'::jsonb),
  ('passive', '被动语态', 3, '构成 be + 过去分词。用于不知道/不重要谁做的，或强调对象；合同高频。',
   '[{"en":"The goods were shipped on May 1st.","zh":"强调货物"},{"en":"The order has been confirmed.","zh":"强调结果"}]'::jsonb,
   '[{"wrong":"We shipped the goods（需强调对象时）","right":"The goods were shipped"}]'::jsonb),
  ('conditional', '条件句', 4, '第一条件句（真实可能）：If + 现在式, will…。第二条件句（假设）：If + 过去式, would/could…。',
   '[{"en":"If you increase the order, we will offer a discount.","zh":"真实可能"},{"en":"If we were to place a larger order, what price could you offer?","zh":"假设"}]'::jsonb,
   '[{"wrong":"If you will increase the order","right":"If you increase the order"}]'::jsonb),
  ('relative_clause', '定语从句', 5, 'who(人)/which(物)/that(限定性常用)/whose(所属)。让句子更专业、信息更密集。',
   '[{"en":"This is the supplier who handles our flooring.","zh":"修饰人"},{"en":"The contract, which we signed last week, covers delivery terms.","zh":"补充说明"}]'::jsonb,
   '[{"wrong":"两个短句堆叠","right":"用定语从句合并成一句"}]'::jsonb)
on conflict (slug) do update set
  name_zh = excluded.name_zh,
  priority = excluded.priority,
  rules_md = excluded.rules_md,
  examples = excluded.examples,
  common_mistakes = excluded.common_mistakes;

insert into public.roleplay_scripts (user_id, category, title, content_en, content_zh) values
  (null, 'setup', '开场咒语', $$You are my English speaking coach and roleplay partner. I work in China's
foreign-trade industry (home and building materials) as assistant to the
Chairman. My spoken English is fine for daily life but I struggle in
professional work situations, and my grammar is weak. My goal is to practice
SPEAKING for work — I do NOT care about my accent.
Rules every time:
1. We do spoken roleplay on a work scenario I choose.
2. Keep YOUR turns fairly short so I do most of the talking.
3. Do NOT silently fix my English. After each thing I say, first briefly point
   out any grammar mistakes or unnatural phrasing and give me the better, more
   professional version — then continue the conversation in character.
4. If I get stuck, give me a useful English phrase instead of switching to Chinese.
5. Push me: ask follow-up questions, raise objections, make me explain and negotiate.
6. When I say "feedback", give me: my top 3 recurring mistakes, 3 useful
   expressions to remember, and one thing to work on next time.
Start by asking which scenario I want to practice.$$,
  '工具无关：复制到任意语音/聊天 AI 后开始练习。'),
  (null, 'reception', '接待外商', 'Let''s roleplay. You are a foreign buyer visiting our company and showroom for the first time. I am the Chairman''s assistant receiving you. Start from meeting me at reception — greeting and small talk — then I''ll show you around. React like a real visitor.', null),
  (null, 'fair', '广交会展位', 'Let''s roleplay. We are at the Canton Fair. You walk up to our booth, interested in tiles and flooring. I greet you and introduce our products. You ask about price, MOQ, and lead time. Be a bit skeptical and push me on the price.', null),
  (null, 'meeting', '主持/协助会议', 'Let''s roleplay a video meeting with an overseas client. You play the client side. I am assisting our Chairman and helping run the meeting. Let me open the meeting, move through a short agenda (project update, pricing, next steps), and wrap up. Interrupt with questions like a real client would.', null),
  (null, 'negotiation', '价格谈判', 'Let''s roleplay. You are a tough overseas client negotiating the price on a large order of building materials. Push hard on price and a shorter lead time. Make me defend our quotation, offer trade-offs, and hold my ground politely. Don''t give in too easily.', null),
  (null, 'followup', '电话跟进', 'Let''s roleplay a phone call. You are an overseas client I met at the Canton Fair. I''m calling to follow up on the quotation and samples I sent. Handle it like a real call — you may be busy, half-interested, or have objections. Make me work to move it forward.', null),
  (null, 'presentation', '公司/产品介绍', 'I will give a 2-minute spoken presentation introducing our company and product lines to a group of foreign clients. Listen to the whole thing, then give me feedback on structure, clarity, and phrasing. After that, ask me 2-3 questions a real client might ask, and let me answer.', null),
  (null, 'improv', '救场练习', 'Let''s practice handling difficult moments. Throw me curveball questions a foreign client might ask that I may not know how to answer (technical specs, certificates, delivery problems, complaints). I''ll practice buying time and responding gracefully in English. After each, tell me a smoother way to handle it.', null),
  (null, 'supplier', '供应商沟通', 'Let''s roleplay. You are an overseas supplier. I''m following up on a delayed shipment and a quality issue. Make me raise the problem clearly, ask for a solution, and push for a firm date — politely but firmly.', null)
on conflict do nothing;
