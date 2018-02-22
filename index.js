import express from 'express';
import request from 'request-promise';
import twilio from 'twilio';
import path from 'path';
import cheerio from 'cheerio';
import { LocalStorage } from 'node-localstorage';
import { Spinner } from 'cli-spinner';

const localStorage = new LocalStorage('./storage');
const publicDir = __dirname + "/../www/";

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const PORT = process.env.PORT || 8082;
const phoneNumbers = process.env.NUMBERS;
const ALERT_AMOUNT = parseInt(process.env.ALERT_AMOUNT);
const INTERVAL = 10 * 60 * 1000;// check every 10 min

const app = express();
const client = new twilio(accountSid, authToken);

app.get('/', function(req, res) {
    res.sendFile(path.join(publicDir + "index.html"));
});

app.use('/', express.static(publicDir));
app.get('/values/', function(req, res) {
	res.send(getValues());
});

app.listen(PORT);

fetchValues();
setInterval(fetchValues, INTERVAL);

function getValues() {
  return {
    coinmama_btc_usd: localStorage.getItem('values/coinmama_btc_usd'),
    coinmama_eth_usd: localStorage.getItem('values/coinmama_eth_usd'),
    cmkt_eth_sell: localStorage.getItem('values/cmkt_eth_sell'),
    cmkt_eth_buy: localStorage.getItem('values/cmkt_eth_buy'),
  };
}

function fetchValues() {
  const spinner = new Spinner('fetching values %s');
  spinner.setSpinnerString('|/-\\');
  spinner.start();

  let promises = [];
  promises.push(fetchCoinmamaEth());
  promises.push(fetchCoinmamaBtc());
  promises.push(fetchCmktEthSell());
  promises.push(fetchCmktEthBuy());

  Promise.all(promises).then(() => {
    spinner.stop();
    checkAlerts();
  });
}

function checkAlerts() {
  const spinner = new Spinner('checking for alerts %s');
  spinner.setSpinnerString('|/-\\');
  spinner.start();
  // check for alert conditions
  spinner.stop();
}

function sendAlert(alertName, message){
  const alertKey = `alerts/lastDate/${alertName}`;

  const d = new Date();
  const currentDate = d.getDate() +'/'+ (d.getMonth()+1) +'/'+ (d.getFullYear());
  lastAlert = localStorage.getItem(alertKey);

  if (!lastAlert || lastAlert != currentDate) { // only one alert per day
    // Save current date as last alert ocurrence
    localStorage.setItem(alertKey, currentDate);
    phoneNumbers.split(',').forEach((n) => {
      console.log('Sending alert to: ' + n + ' Date:' + currentDate);
      client.messages.create({
        body: message,
        to: n,
        from: twilioNumber,
      }).then(message => console.log('message id: ' + message.sid)); 
    });
  
  }else{
    console.log('Already sent an alert today: ' + lastAlert);
  }
}

// Different api request to get prices

function fetchCoinmamaEth() {
  return request({
    method: 'POST',
    url: 'https://www.coinmama.com/ajax/get_packages',
    headers: { 
      'Cache-Control': 'no-cache',
      'cookie': '_ga=GA1.2.1749618640.1518005135; ftr_ncd=6; __ssid=a7165881-59cf-40ca-aae3-9d99fcf87062; __zlcmid=krh6X3YrVT0lcQ; PHPSESSID=cma22uvp7p1ib3kbt45fkdod62; _hjIncludedInSample=1; visid_incap_1551563=EtfLZg2mSbywpqcCx0MbmIfreloAAAAAQ0IPAAAAAACAQ1uCAb6kFGPCpnuB85RGM6nXz7yXaxuV; __context=QDakH4J938zEYqIRlbw6GkELZaSnGP01kSxrHVCjxaSryf0lj5/TUqJvCBlSJFMFo11ppalMioQILq2kU3HgWg==; incap_ses_785_1551563=pc2hVnQJ2zoQ+FAmj+HkClQejloAAAAAkGqivuRMUEsGjAqdI/RfZg==; __insp_wid=460266710; __insp_nv=true; __insp_targlpu=aHR0cHM6Ly93d3cuY29pbm1hbWEuY29tLw%3D%3D; __insp_targlpt=Q29pbm1hbWEgfCBCdXkgQml0Y29pbnMgd2l0aCBDcmVkaXQgQ2FyZA%3D%3D; __insp_norec_sess=true; ftr_blst_1h=1519264097683; __insp_slim=1519264939778; forterToken=41238d25135f4829be4b3f089edc1438_1519265548471__UDF4',
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
    },
    formData: {
      token: 'd35ff5540b0be28064b9002c101ef289',
      'coins[]': 'eth',
    }
  }).then((res) => {
    const data = JSON.parse(res);
    const price = data.eth[3].price + 0.95;
    const qty = data.eth[3].qty;
    const coinmamaEthUsd = price/qty;
    console.log('coinmama eth', coinmamaEthUsd);
    localStorage.setItem('values/coinmama_eth_usd', coinmamaEthUsd.toFixed(2));
  }).catch((err) => {
    console.log('Error fetching coinmama eth', err);
  });
}

function fetchCoinmamaBtc() {
  return request({
    method: 'POST',
    url: 'https://www.coinmama.com/ajax/get_packages',
    headers: { 
      'Cache-Control': 'no-cache',
      'cookie': '_ga=GA1.2.1749618640.1518005135; ftr_ncd=6; __ssid=a7165881-59cf-40ca-aae3-9d99fcf87062; __zlcmid=krh6X3YrVT0lcQ; PHPSESSID=cma22uvp7p1ib3kbt45fkdod62; _hjIncludedInSample=1; visid_incap_1551563=EtfLZg2mSbywpqcCx0MbmIfreloAAAAAQ0IPAAAAAACAQ1uCAb6kFGPCpnuB85RGM6nXz7yXaxuV; __context=QDakH4J938zEYqIRlbw6GkELZaSnGP01kSxrHVCjxaSryf0lj5/TUqJvCBlSJFMFo11ppalMioQILq2kU3HgWg==; incap_ses_785_1551563=pc2hVnQJ2zoQ+FAmj+HkClQejloAAAAAkGqivuRMUEsGjAqdI/RfZg==; __insp_wid=460266710; __insp_nv=true; __insp_targlpu=aHR0cHM6Ly93d3cuY29pbm1hbWEuY29tLw%3D%3D; __insp_targlpt=Q29pbm1hbWEgfCBCdXkgQml0Y29pbnMgd2l0aCBDcmVkaXQgQ2FyZA%3D%3D; __insp_norec_sess=true; ftr_blst_1h=1519264097683; __insp_slim=1519264939778; forterToken=41238d25135f4829be4b3f089edc1438_1519265548471__UDF4',
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
    },
    formData: {
      token: 'd35ff5540b0be28064b9002c101ef289',
      'coins[]': 'btc',
    }
  }).then((res) => {
    const data = JSON.parse(res);
    const price = data.btc[3].price + 0.95;
    const qty = data.btc[3].qty;
    const coinmamaBtcUsd = price/qty;
    console.log('coinmama btc', coinmamaBtcUsd);
    localStorage.setItem('values/coinmama_btc_usd', coinmamaBtcUsd.toFixed(2));
  }).catch((err) => {
    console.log('Error fetching coinmama btc', err);
  });
}

function fetchCmktEthSell() {
  return request({
    method: 'GET',
    url: 'https://www.cryptomkt.com/api/ethclp/1440.json',
    headers: { 
      'Postman-Token': 'f4f68dc9-484d-0455-d253-4413cde4faec',
      'Cache-Control': 'no-cache',
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
    },
  }).then((res) => {
    const data = JSON.parse(res);
    const cmktEthSell = data.data.prices_ask.values[0].close_price;
    console.log('cmkt eth sell', cmktEthSell);
    localStorage.setItem('values/cmkt_eth_sell', cmktEthSell);
  }).catch((err) => {
    console.log('Error fetching cmkt eth sell', err);
  });
}

function fetchCmktEthBuy() {
  return request({
    method: 'GET',
    url: 'https://www.cryptomkt.com/api/ethclp/1440.json',
    headers: { 
      'Postman-Token': 'f4f68dc9-484d-0455-d253-4413cde4faec',
      'Cache-Control': 'no-cache',
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
    },
  }).then((res) => {
    const data = JSON.parse(res);
    const cmktEthBuy = data.data.prices_bid.values[0].close_price;
    console.log('cmkt eth buy', cmktEthBuy);
    localStorage.setItem('values/cmkt_eth_buy', cmktEthBuy);
  }).catch((err) => {
    console.log('Error fetching cmkt eth buy', err);
  });
}