/** NEXO · GUÍA DEL MÓDULO: deploy/check-linux-voice.mjs */
/** QA Linux: tres WAV reales; no envía audio ni texto a proveedores externos. */
import assert from 'node:assert/strict';
import {LocalTtsService} from '../server/providers/local-tts.js';
const voice=new LocalTtsService({executable:process.env.PIPER_EXECUTABLE||'/opt/piper/bin/piper',voicesDirectory:process.env.PIPER_VOICES_DIR||'/voices',engineVersion:'piper-tts-1.4.1'});
for(const [language,text] of [['es','Buenos días. ¿En qué puedo ayudarle?'],['en','Good morning. How can I help you?'],['fr','Bonjour. Comment puis-je vous aider ?']]){
  assert.equal(voice.status(language).available,true);
  const result=await voice.synthesize(text,{owner:'linux-qa',language});
  const wav=Buffer.from(result.audioBase64,'base64');
  assert.equal(wav.toString('ascii',0,4),'RIFF');assert.ok(result.duration>0&&result.duration<20);
  assert.equal(wav.readUInt32LE(24),22050);
  const identity=await voice.cacheIdentity(language);assert.equal(identity.engineVersion,'piper-tts-1.4.1');
  console.log(language+': WAV válido, '+result.duration.toFixed(2)+' segundos.');
}
voice.close();
