var express = require('express');
var formatCurrency = require('format-currency')
var axios = require('axios');
var cheerio = require('cheerio');
var app = express();
var path = require('path');
var public = __dirname + "/www/";
const PORT = process.env.PORT || 8082;

// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(public + "index.html"));
});

app.use('/', express.static(public));

app.get('/values/', function(req, res) {
	getValues(res);
});

app.listen(PORT);


function getValues(res){
	var btcCLP, ethCLP, btcEth, btcUSD, ethUSD, dgbUSD, xrpUSD;

	var p1 = axios.get('https://www.surbtc.com/api/v2/markets/btc-clp/ticker')
  	.then(function (response) {
  		btcCLP = response.data.ticker.last_price[0];
  	}).catch(function (error) {
    	console.log(error);
  	});

  	var p2 = axios.get('https://www.cryptomkt.com/api/ethclp/1440.json')
  	.then(function (response) {
  		ethCLP = response.data.data.prices_bid.values[0].close_price;
  	}).catch(function (error) {
    	console.log(error);
  	});

  	var p3 = axios.get('https://btc-e.com')
  	.then(function (response) {
  		$ = cheerio.load(response.data);
  		btcUSD = $('#last1').html();
  		ethUSD = $('#last41').html();
  		btcEth = 1/parseFloat($('#last40').html()).toFixed(2);
  	}).catch(function (error) {
    	console.log(error);
  	});

  	var p4 = axios.get('https://coinmarketcap.com/currencies/ripple/')
  	.then(function (response) {
  		$ = cheerio.load(response.data);
  		xrpUSD = $('#quote_price').html().replace('$', '');
  	}).catch(function (error) {
    	console.log(error);
  	});

  	var p5 = axios.get('https://coinmarketcap.com/currencies/digibyte/')
  	.then(function (response) {
  		$ = cheerio.load(response.data);
  		dgbUSD = $('#quote_price').html().replace('$', '');
  	}).catch(function (error) {
    	console.log(error);
  	});

  	Promise.all([p1, p2, p3, p4, p5]).then((values) => { 

  		var arbitrage1 = (btcEth * ethCLP - btcCLP) - (btcCLP * 0.007);

	  	res.send({
	  		btcUSD: formatCurrency(btcUSD),
	  		ethUSD: formatCurrency(ethUSD),

	  		dgbUSD: dgbUSD,
	  		xrpUSD: xrpUSD,

			btcCLP: formatCurrency(btcCLP),
			ethCLP: formatCurrency(ethCLP),
			btcEth: btcEth,
			arbitrage1: formatCurrency(arbitrage1),
		});
	});

}