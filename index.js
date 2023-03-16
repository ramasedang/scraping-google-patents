const puppeteer = require('puppeteer');
const fs = require('fs');
const cheerio = require('cheerio');
const json2csv = require('json2csv').parse;

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

const patentsScraping = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-web-security',
      '--disable-gpu',
    ],
    // executablePath: '/usr/bin/chromium-browser',
  });

  let patent = [];

  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (
      req.resourceType() == 'stylesheet' ||
      req.resourceType() == 'font' ||
      req.resourceType() == 'image'
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });
  let grant_id = [];
  for (let i = 0; i <= 9; i++) {
    const search_key =
      'https://patents.google.com/?q=(Virtual+Nursing+Assistant)&num=100&oq=Virtual+Nursing+Assistant&page=' +
      i;
    await page.goto(search_key, { waitUntil: 'networkidle2' });
    await page.waitForSelector(
      '#count > div.layout.horizontal.style-scope.search-results > span.headerButton.style-scope.search-results > a'
    );
    const $ = cheerio.load(await page.content());
    const selector =
      '#resultsContainer > section > search-result-item';
    $(selector).each((i, el) => {
      const temp_grant_id = $(el)
        .find(
          'article > div > div > div > div.flex.style-scope.search-result-item > h4.metadata.style-scope.search-result-item > span.bullet-before.style-scope.search-result-item > a > span'
        )
        .text();
      grant_id.push(temp_grant_id);
    });
  }
  let filteredArr = grant_id.filter((str) => /^US.*/.test(str));
  console.log(filteredArr);
  for (let i = 0; i <filteredArr.length; i++) {
    const url_template =
      'https://patents.google.com/patent/' +
      filteredArr[i] +
      '/en?q=(Virtual+Nursing+Assistant)&oq=Virtual+Nursing+Assistant'.replace(
        /Current.*$/,
        ''
      );
    await page.goto(url_template, { waitUntil: 'networkidle2' });
    let extractedText = await page.$eval('*', (el) => el.innerText);
    fs.writeFileSync('output.txt', extractedText.toString());
    //   console.log(extractedText);
    //to string
    extractedText = extractedText.toString();
    const startIndex = extractedText.indexOf('What is claimed is:');
    let claims = extractedText.slice(startIndex);

    const endIndex = claims.indexOf('Patent Citations');
    claims = claims.slice(0, endIndex);
    const inventorRegex = /^Inventor.*$/gm;
    let Inventor = extractedText.match(inventorRegex);
    //invetor to string
    if (Inventor) {
      Inventor = Inventor.toString();
    } else {
      Inventor = 'Na';
    }
    //remove inventor
    Inventor = Inventor.replace('Inventor', '').replace(
      /Current.*$/,
      ''
    );
    // console.log(Inventor);
    const $2 = cheerio.load(await page.content());
    let abstract = $2('#p-0001');
    // console.log(abstract.text());

    patent.push({
      grant_id: filteredArr[i],
      inventor: Inventor,
      claims: claims,
      abstract: abstract.text(),
    });

    fs.writeFileSync('patent.json', JSON.stringify(patent));
    const csv = json2csv(patent);
    fs.writeFileSync('patent.csv', csv);
  }
};

patentsScraping();
