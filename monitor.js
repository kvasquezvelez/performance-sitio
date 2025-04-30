import axios from 'axios';
import fs from 'fs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SITIO;
const apiKey = process.env.API_KEY;
const emailDestino = process.env.EMAIL_DESTINO;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const archivoScore = 'ultimoScore.json';

async function obtenerPerformance() {
  try {
    const { data } = await axios.get(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&key=${apiKey}`
    );
    const score = data.lighthouseResult.categories.performance.score * 100;
    return score;
  } catch (error) {
    console.error('Error al obtener performance:', error.message);
    return null;
  }
}

function leerUltimoScore() {
  try {
    if (fs.existsSync(archivoScore)) {
      const contenido = fs.readFileSync(archivoScore, 'utf-8');
      return JSON.parse(contenido).score;
    }
  } catch (err) {
    console.error('Error leyendo archivo:', err.message);
  }
  return null;
}

function guardarScore(score) {
  try {
    fs.writeFileSync(archivoScore, JSON.stringify({ score }), 'utf-8');
  } catch (err) {
    console.error('Error guardando archivo:', err.message);
  }
}

async function enviarCorreo(scoreAnterior, scoreNuevo) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mensaje = {
    from: `"Alerta Performance" <${emailUser}>`,
    to: emailDestino,
    subject: '⚠️ Alerta: El performance de tu sitio ha cambiado',
    text: `Tu sitio: ${url}\n\nEl score de performance cambió de ${scoreAnterior} a ${scoreNuevo}.\n\nRevisa tu sitio y toma medidas si es necesario.`,
  };

  try {
    await transporter.sendMail(mensaje);
    console.log('Correo enviado.');
  } catch (error) {
    console.error('Error al enviar el correo:', error.message);
  }
}

async function main() {
  const scoreNuevo = await obtenerPerformance();
  if (scoreNuevo === null) return;

  const scoreAnterior = leerUltimoScore();

  if (scoreAnterior === null) {
    console.log('Primer registro de score:', scoreNuevo);
    guardarScore(scoreNuevo);
    return;
  }

  if (scoreNuevo !== scoreAnterior) {
    console.log(`El score ha cambiado: ${scoreAnterior} → ${scoreNuevo}`);
    await enviarCorreo(scoreAnterior, scoreNuevo);
    guardarScore(scoreNuevo);
  } else {
    console.log('El score no ha cambiado:', scoreNuevo);
  }
}

main();
