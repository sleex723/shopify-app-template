const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'write_products';
const forwardingAddress = "https://ebaa7fd1.ngrok.io" //Replace this with your HTTPS forwarding address

//https://ebaa7fd1.ngrok.io/shopify?shop=wunderapps.myshopify.com

app.get('/shopify', (req, res) => {
  const shop = req.query.shop;
  if (shop) {
    const state = nonce();
    const redirectUri = `${forwardingAddress}/shopify/callback`;
    const installUrl = `https://${shop}/admin/oath/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;

    res.cookie('state', state);
    res.redirect(installUrl);

  } else {
    return res.status(400).send('missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
  }

})

app.get('/shopify/callback', (req, res) => {
  const { shop, hmac, code, state } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;

  if (state !== stateCookie) {
    return res.status(403).send('Request origin cannot be verified');
  }

  if (shop && hmac && code) {
    const map = Object.assign({}, req.query);
    delete map['hmac'];
    const message = querystring.stringify(map);
    const generatedHash = crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex');

    if (generatedHash !== hmac) {
      return res.status(400).send('HMAC Validation Failed');
    }

    const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
    const accessTokenPayload = {
      client_id: apiKey,
      client_secret: apiSecret,
      code
    }

    request.post(accessTokenRequestUrl, {json: accessTokenPayload})
      .then((accessTokenResponse) => {
        const accessToken = accessTokenResponse.access_token;
      
        const apiRequestUrl = `https://${shop}/admin/shop.json`;
        const apiRequestHeader = {
          'X-Shopify-Access-Token': accessToken
        };

        request.get(apiRequestUrl, { headers: apiRequestHeader })
          .then(apiResponse => {
            res.end(apiResponse);
          })
          .catch(error => {
            res.status(error.statusCode).send(error.error.error_description);
          })
      })
      .catch(error => {
        res.status(error.statusCode).send(error.error.error_description);
      })

  } else {
    res.status(400).send('Required parameters missing');
  }
});

app.listen(3000, () => {
  console.log('Shopify app listening on port 3000');
})