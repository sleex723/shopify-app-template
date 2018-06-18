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

app.get('/shopify', (req, res) => {
  const shop = req.query.shop;
  if (shop) {
    const state = nonce();
    const redirectUri = forwardingAddress + '/shopify/callback';
    const installUrl = `https://${shop}/admin/oath/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirectUri=${redirectUri}`;

    res.cookie('state', state);
    res.redirect(installUrl);

  } else {
    return res.status(400).send('missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
  }

})

app.listen(3000, () => {
  console.log('Shopify app listening on port 3000');
})