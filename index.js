var express = require('express');
var formatCurrency = require('format-currency')
var axios = require('axios');
var cheerio = require('cheerio');
var app = express();
var path = require('path');
var qs = require('qs');
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
	var btcCLP, ethCLP, clpETH, btcEth, btcUSD, btcUSDPerc, ethUSD, dgbUSD, dgbUSDPerc, xrpUSD, xrpUSDPerc;
  
  var pOptions = {
    method: 'POST',
    url: 'https://www.surbtc.com/api/v2/markets/btc-clp/quotations',
    data: { 
      type: 'bid_given_earned_base',
      amount: [1,'BTC'],
      market_id: null
    },
    headers: {
        'Accept':'application/json',
        'Accept-Encoding' : 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.8,es;q=0.6,pt;q=0.4,gl;q=0.2,nb;q=0.2',
        'Cache-Control':'no-cache',
        'Connection':'keep-alive',
        'Content-Length':'68',
        'Content-Type':'application/json;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    },
    json: true
  };

	var p = axios(pOptions)
  	.then(function (response) {
  		btcCLP = response.data.quotation.quote_exchanged[0];
      console.log(response);
  	}).catch(function (error) {
    	console.log(error);
  	});

    var p1 = axios.get('https://www.surbtc.com/api/v2/markets/btc-clp/ticker')
    .then(function (response) {
      btcCLPSell = response.data.ticker.last_price[0];
    }).catch(function (error) {
      console.log(error);
    });

  	var p2 = axios.get('https://www.cryptomkt.com/api/ethclp/1440.json')
  	.then(function (response) {
  		ethCLP = response.data.data.prices_bid.values[0].close_price;
      clpETH = response.data.data.prices_ask.values[0].hight_price;
  	}).catch(function (error) {
    	console.log(error);
  	});

  	var p3 = axios.get('https://btc-e.com/exchange/btc_usd')
  	.then(function (response) {
  		$ = cheerio.load(response.data);
  		btcUSD = $('#last1').html();
  		btcUSDPerc = $('#orders-stats .orderStats:first-child strong:nth-child(2)').html();
  		ethUSD = $('#last41').html();
  		btcEth = (1/parseFloat($('#last40').html())).toFixed(2);

  	}).catch(function (error) {
    	console.log(error);
  	});

  	var p4 = axios.get('https://coinmarketcap.com/currencies/ripple/')
  	.then(function (response) {
  		$ = cheerio.load(response.data);
  		xrpUSD = $('#quote_price').html().replace('$', '');
  		xrpUSDPerc = $('#quote_price+span').html().replace('(', '').replace(')', '');
  	}).catch(function (error) {
    	console.log(error);
  	});

  	var p5 = axios.get('https://coinmarketcap.com/currencies/digibyte/')
  	.then(function (response) {
  		$ = cheerio.load(response.data);
  		dgbUSD = $('#quote_price').html().replace('$', '');
  		dgbUSDPerc = $('#quote_price+span').html().replace('(', '').replace(')', '');
  	}).catch(function (error) {
    	console.log(error);
  	});


  	var p6 = axios.get('https://btc-e.com/exchange/eth_usd')
  	.then(function (response) {
  		$ = cheerio.load(response.data);
  		ethUSDPerc = $('#orders-stats .orderStats:first-child strong:nth-child(2)').html();
  	}).catch(function (error) {
    	console.log(error);
  	});

  	Promise.all([p, p1, p2, p3, p4, p5, p6]).then((values) => { 

      var surBTCFee = (btcCLP * 0.007);

  		var arbitrage1 = (btcEth * ethCLP - btcCLP) - surBTCFee;
      var arbitrage2 = (btcCLP - (btcEth * clpETH)) - surBTCFee;

	  	res.send({
	  		btcUSD: formatCurrency(btcUSD),
	  		btcUSDPerc: btcUSDPerc,

	  		ethUSD: formatCurrency(ethUSD),
	  		ethUSDPerc: ethUSDPerc,

	  		dgbUSD: dgbUSD,
	  		dgbUSDPerc: dgbUSDPerc,

	  		xrpUSD: xrpUSD,
	  		xrpUSDPerc: xrpUSDPerc,

        btcCLP: formatCurrency(btcCLP),
        btcCLPSell: formatCurrency(btcCLPSell)

        ethCLP: formatCurrency(ethCLP),

        clpETH: formatCurrency(clpETH),

        btcEth: btcEth,

        arbitrage1: formatCurrency(arbitrage1),
        arbitrage2: formatCurrency(arbitrage2),
		});
	});

}