const AuthenticationController = require('./controllers/authentication');
const OrderController = require('./controllers/order');
const FeedbackController = require('./controllers/feedback');
const MailController = require('./controllers/mail');
const TemplateController = require('./controllers/template');
const CampaignController = require('./controllers/campaign');
const PageController = require('./controllers/page');
const CronJobCustomController = require('./controllers/cronCustom');
const ProductController = require('./controllers/product');
const PackageController = require('./controllers/package');
const DemoController = require('./controllers/demo');
const UserController = require('./controllers/user');
const ChatController = require('./controllers/chat');
const CommunicationController = require('./controllers/communication');
const StripeController = require('./controllers/stripe');
const express = require('express');
const passport = require('passport');
const ROLE_MEMBER = require('./constants').ROLE_MEMBER;
const ROLE_CLIENT = require('./constants').ROLE_CLIENT;
const ROLE_OWNER = require('./constants').ROLE_OWNER;
const ROLE_ADMIN = require('./constants').ROLE_ADMIN;

const passportService = require('./config/passport');

// Middleware to require login/auth
const requireAuth = passport.authenticate('jwt', {session: false});
const requireLogin = passport.authenticate('local', {session: false});

module.exports = function (app) {
    // Initializing route groups
    const apiRoutes = express.Router(),
        authRoutes = express.Router(),
        userRoutes = express.Router(),
        chatRoutes = express.Router(),
        payRoutes = express.Router(),
        communicationRoutes = express.Router();

    //= ========================
    // Auth Routes
    //= ========================

    // Set auth routes as subgroup/middleware to apiRoutes
    apiRoutes.use('/auth', authRoutes);


    // Registration route
    authRoutes.post('/register', AuthenticationController.register);


    // Login route
    authRoutes.post('/login', requireLogin, AuthenticationController.login);

    // Password reset request route (generate/send token)
    authRoutes.post('/forgot-password', AuthenticationController.forgotPassword);

    // Password reset route (change password using token)
    authRoutes.post('/reset-password/:token', AuthenticationController.verifyToken);

    //= ========================
    // User Routes
    //= ========================

    // Set user routes as a subgroup/middleware to apiRoutes
    apiRoutes.use('/user', userRoutes);

    // View user profile route
    userRoutes.get('/:userId', requireAuth, UserController.viewProfile);

    // Test protected route
    apiRoutes.get('/protected', requireAuth, (req, res) => {
        res.send({content: 'The protected test route is functional!'});
    });

    apiRoutes.get('/admins-only', requireAuth, AuthenticationController.roleAuthorization(ROLE_ADMIN), (req, res) => {
        res.send({content: 'Admin dashboard is working.'});
    });

    //= ========================
    // Chat Routes
    //= ========================

    // Set chat routes as a subgroup/middleware to apiRoutes
    apiRoutes.use('/chat', chatRoutes);

    // View messages to and from authenticated user
    chatRoutes.get('/', requireAuth, ChatController.getConversations);

    // Retrieve single conversation
    chatRoutes.get('/:conversationId', requireAuth, ChatController.getConversation);

    // Send reply in conversation
    chatRoutes.post('/:conversationId', requireAuth, ChatController.sendReply);

    // Start new conversation
    chatRoutes.post('/new/:recipient', requireAuth, ChatController.newConversation);

    //= ========================
    // Payment Routes
    //= ========================
    apiRoutes.use('/pay', payRoutes);

    // Webhook endpoint for Stripe
    payRoutes.post('/webhook-notify', StripeController.webhook);

    // Create customer and subscription
    payRoutes.post('/customer', requireAuth, StripeController.createSubscription);

    // Update customer object and billing information
    payRoutes.put('/customer', requireAuth, StripeController.updateCustomerBillingInfo);

    // Delete subscription from customer
    payRoutes.delete('/subscription', requireAuth, StripeController.deleteSubscription);

    // Upgrade or downgrade subscription
    payRoutes.put('/subscription', requireAuth, StripeController.changeSubscription);

    // Fetch customer information
    payRoutes.get('/customer', requireAuth, StripeController.getCustomer);

    //= ========================
    // Communication Routes
    //= ========================
    apiRoutes.use('/communication', communicationRoutes);

    // Send email from contact form
    communicationRoutes.post('/contact', CommunicationController.sendContactForm);


    /********************************************** Account Activation *****************************************/
    apiRoutes.use('/active_account/:id', PageController.activeAccount);
    /********************************************** Account Activation *****************************************/

    /******************************************** Order Route ***********************************************/
    // Order route
    apiRoutes.get('/orders', OrderController.list);
    // Filter Orders route
    apiRoutes.post('/orders', OrderController.filterList);
    //apiRoutes.get('/order_analysis', OrderController.getOrderAnalysis);
    apiRoutes.post('/order_analysis_filter', OrderController.getOrderAnalysisFilter);
    
    // get products
    apiRoutes.get('/products', ProductController.list);
    apiRoutes.post('/products', ProductController.filterList);
    apiRoutes.get('/product_report_request', ProductController.requestReport);
    // apiRoutes.get('/product_report_request', ProductController.getProducts);

    apiRoutes.get('/save_product_report/:id', ProductController.saveProductReport); // not found in client

    apiRoutes.post('/top_product', ProductController.topTenProducts);

    // test single product scraping
    apiRoutes.get('/single/product', ProductController.singleProduct); // not found in client
    apiRoutes.get('/delete/products', ProductController.deleteProducts); // not found in client

    // ######################### need SellerId from Auth::User()
    apiRoutes.get('/orders_from_api', OrderController.getOrder); // not found in client

    // ######################### need SellerId from Auth::User()
    // Sending email to the order maker by rasel
    apiRoutes.post('/send_mail_to_orderer', OrderController.sendMailToOrderer);
    apiRoutes.post('/send_mail_to_orderer_with_template', OrderController.sendMailToOrdererWithTemplate);

    /******************************************** End Order Route ***********************************************/

    // ######################### need SellerId from Auth::User()
    /******************************************** FeedBack ***********************************************/
    apiRoutes.get('/feedback', FeedbackController.list);
    apiRoutes.post('/feedback', FeedbackController.filterList);
    // apiRoutes.get('/feedback_analysis', FeedbackController.getFeedbackAnalysis);
    apiRoutes.post('/feedback_analysis', FeedbackController.getFeedbackAnalysis);
    apiRoutes.get('/recent_feedback', FeedbackController.recentFeedback);
    apiRoutes.post('/remove_feedback_request', FeedbackController.sentRemoveFeedbackRequest);
    // apiRoutes.get('/remove_total_feedback_request', FeedbackController.getRemoveFeedbackRequest);
    // 
    // Testing
    // apiRoutes.get('/negative/feedback', FeedbackController.getNegativeFeedback);


    // ######################### need SellerId from Auth::User()
    // Manual Cron Process //
    apiRoutes.get('/request_report', FeedbackController.requestReport); // not found in client
    apiRoutes.get('/report_list', FeedbackController.getReportList); // not found in client
    apiRoutes.get('/report_request_list', FeedbackController.getReportRequestList); // not found in client
    apiRoutes.get('/report/:id', FeedbackController.getReport); //not found in client


    // ######################### need SellerId from Auth::User()
    // Scrapping Data
    apiRoutes.get('/product_feedback/:id', FeedbackController.getProductFeedback); // client not found
    apiRoutes.get('/feedback_report_request', FeedbackController.getAllFeedback);  // get data from mws

    /******************************************** FeedBack ***********************************************/


    // ######################### need SellerId from Auth::User()
    /******************************************** Template ***********************************************/
    // test file upload
    // apiRoutes.post('/logo_upload', TemplateController.templateFileUpload);
    apiRoutes.post('/create_template', requireAuth, TemplateController.createTemplate); // its already takeing user_id instead of userId
    apiRoutes.put('/modify_template', requireAuth, TemplateController.update); // its already taking user_id instead of userId
    apiRoutes.put('/toggle_template_status', requireAuth, TemplateController.toggleTemplateStatus); // it doesn't require userId
    apiRoutes.get('/templates', requireAuth, TemplateController.list);
    apiRoutes.get('/preview_template/:id', requireAuth, TemplateController.previewTemplate); // it doesnt require userId
    apiRoutes.delete('/delete_template/:id', requireAuth, TemplateController.delete);
    apiRoutes.get('/unsubscribes', TemplateController.unsubscribes); // client not found
    apiRoutes.get('/unsubscribe_analysis', TemplateController.unsubscribeStats); // its taking user_id instead of userId
    apiRoutes.post('/template/analysis', TemplateController.templateAnalysis);
    /******************************************** Template ***********************************************/

    /******************************************** Campaign ***********************************************/ 
    apiRoutes.post('/create_campaign', requireAuth, CampaignController.createCampaign);
    apiRoutes.post('/modify_campaign', requireAuth, CampaignController.update);
    apiRoutes.get('/campaigns', requireAuth, CampaignController.list);
    apiRoutes.delete('/delete_campaign/:id', requireAuth, CampaignController.delete);
    /******************************************** Campaign *  end ***********************************************/

    /******************************************** Mail ***********************************************/
    apiRoutes.post('/send-test-template-mail', MailController.sendTestMail);
    apiRoutes.post('/send-test-edit-template-mail', MailController.sendTestMailFromEditTemplate);
    apiRoutes.post('/resend_mail', MailController.resentWelcomeMail);

    /******************************************** Mail ***********************************************/
    

    // ######################### need SellerId from Auth::User()
    /******************************************** Dashboard ***********************************************/
    apiRoutes.post('/dashboard/data/summary', OrderController.dashboardSummary);
    /******************************************** /Dashboard ***********************************************/
    

    /******************************************** Plan CRUD ***********************************************/
    apiRoutes.get('/packages', PackageController.list);
    apiRoutes.post('/create/package', PackageController.create);
    apiRoutes.post('/update/package', PackageController.update);
    apiRoutes.delete('/delete/package/:id', PackageController.delete);
    /******************************************** /Plan CRUD ***********************************************/

    // ######################### need SellerId from Auth::User()
    // Cron Custom Way
    apiRoutes.get('/cron_job/get_orders', CronJobCustomController.orders);
    apiRoutes.get('/cron_job/get_order_items', CronJobCustomController.orderItems);


    // Profile update
    apiRoutes.post('/update_profile', UserController.update_profile);

    // Retrieve single conversation
    apiRoutes.get('/order_item/:id', OrderController.getOrderItem);

    // Order route
    apiRoutes.post('/demo/order/config', DemoController.orderConfig);
    apiRoutes.get('/demo/cron', DemoController.cron);

    // ######################### need SellerId from Auth::User()
    // Sending schedule newsletter to user based on order status by rasel
    apiRoutes.get('/cron_job/run_template_scheduler', OrderController.sendScheduleLetter);

    // Set url for API group routes
    app.use('/api', apiRoutes);
};
