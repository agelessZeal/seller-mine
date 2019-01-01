module.exports = {

    // Secret key for JWT signing and encryption
    secret: 'super secret passphrase',

    // Database connection information
    // database: 'mongodb://scdev:abc123@ds151612.mlab.com:51612/sellercapital_dev',
    database: 'mongodb://scdev:abc123@ds023213.mlab.com:23213/scdev',
    //database: 'mongodb://localhost:27017/scdev',
    // database: 'mongodb://sale:abc123@ds239412.mlab.com:39412/salercapital',

    // Setting port for server
    port: 9001,

    // Configuring Mailgun API for sending transactional email
    mailgun_priv_key: 'mailgun private key here',

    // Configuring Mailgun domain for sending transactional email
    mailgun_domain: 'mailgun domain here',

    // Mailchimp API key
    mailchimpApiKey: 'mailchimp api key here',

    // SendGrid API key
    sendgridApiKey: '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',

    // Amazon Access Keys
    MWS_KEY: 'AKIAIEGT53RIXYQUCTPQ',

    // Amazon Secret Keys
    MWS_SECRET: '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',
    // Stripe API key
    stripeApiKey: 'stripe api key goes here',
    // necessary in order to run tests in parallel of the main app
    test_port: 9002,
    test_db: 'mern-starter-test',
    test_env: 'test',

    //7Lines code
    order_period: 15,
    order_schedule: '_15_MINUTES_',
    baseURI: 'https://mws.amazonservices.com',
    mws: {
        "AWSAccessKeyId": 'AKIAIEGT53RIXYQUCTPQ',
        "MWSAuthToken": 'amzn.mws.3aaf2cf5-417d-c970-3895-30d590fa88f8',
        "SellerId": 'A1LWZ980X488GK',
        "MarketplaceID": 'ATVPDKIKX0DER',
        "SignatureMethod": "HmacSHA256",
        "SignatureVersion": "2",
        "Version": '2011-07-01',
        "SecretKey": 'VdToubCLaeVs+ngo3g7aIGCUzlqsisfCVWnKCga6'
    },
    marketplaces: [
        'A1AM78C64UM0Y8',
        'A1MQXOICRS2Z7M',
        'A2EUQ1WTGCTBG2',
        'A2ZV50J4W1RKNI',
        'A3BXB0YN3XH17H',
        'A3H6HPSLHAK3XG',
        'A6W85IYQ5WB1C',
        'AGWSWK15IEJJ7',
        'ATVPDKIKX0DER'
    ]
};
