(() => {
  'use strict';
  const services = {
    route53: {name:'Amazon Route 53',role:'DNS & Domain',summary:'Connects the Cloudy Joe domain name to the site’s delivery infrastructure.',why:'Route 53 manages DNS records for the domain, pointing visitors toward CloudFront.',details:['Domain and DNS records','Works with CloudFront aliases','Public DNS does not itself authenticate users']},
    cloudfront:{name:'Amazon CloudFront',role:'Content Delivery',summary:'Delivers the frontend over HTTPS and caches static content near visitors.',why:'CloudFront serves content from the private S3 origin using Origin Access Control.',details:['CDN distribution and custom domain','Origin Access Control (OAC)','HTTPS using an ACM certificate']},
    s3:{name:'Amazon S3',role:'Private Frontend Storage',summary:'Stores the HTML, CSS, JavaScript, and artwork used by the portfolio.',why:'The frontend bucket is private; CloudFront is the intended path for serving its objects.',details:['Private frontend bucket','Static frontend files','No public bucket access required']},
    cognito:{name:'Amazon Cognito',role:'Authentication & Access',summary:'Handles sign-in with one-time passcodes and supports approved-user access.',why:'Cognito provides identity management while the application checks the authorization required for protected features.',details:['One-time passcode sign-in','Approved user group','Admin authorization enforced by backend']},
    apigateway:{name:'Amazon API Gateway',role:'API Endpoints',summary:'Receives application requests from the frontend and routes them to backend functions.',why:'Separating frontend delivery from API endpoints keeps the architecture modular.',details:['HTTPS API endpoints','Request handling and routing','Protected endpoints require authorization']},
    lambda:{name:'AWS Lambda',role:'Serverless Backend',summary:'Runs backend code for workflows such as access requests and approvals.',why:'Lambda provides event-driven application logic without maintaining a dedicated server.',details:['Node.js serverless functions','Access-request and approval logic','CloudWatch logging for troubleshooting']},
    dynamodb:{name:'Amazon DynamoDB',role:'Application Data',summary:'Stores application records used by the access-request workflow.',why:'DynamoDB gives the backend managed NoSQL storage for request status and related data.',details:['Managed NoSQL database','Access-request records','Read and updated by Lambda']},
    acm:{name:'AWS Certificate Manager',role:'TLS Certificates',summary:'Provides the certificate used for HTTPS on the custom CloudFront domain.',why:'ACM helps keep encrypted connections to the public site straightforward to manage.',details:['Custom domain TLS certificate','CloudFront HTTPS support','Certificate issued in us-east-1']}
  };
  const content = document.getElementById('service-content');
  const pins = [...document.querySelectorAll('.map-pin')];
  function selectService(id) {
    const service=services[id]; if(!service)return;
    pins.forEach(pin=>{const active=pin.dataset.service===id;pin.classList.toggle('is-active',active);pin.setAttribute('aria-pressed',String(active));});
    content.replaceChildren();
    const title=document.createElement('h2');title.textContent=service.name;
    const role=document.createElement('p');role.className='service-role';role.textContent=service.role;
    const summary=document.createElement('p');summary.className='service-summary';summary.textContent=service.summary;
    const heading=document.createElement('h3');heading.textContent='Why it is here';
    const why=document.createElement('p');why.textContent=service.why;
    const listHeading=document.createElement('h3');listHeading.textContent='Key details';
    const list=document.createElement('ul');service.details.forEach(t=>{const li=document.createElement('li');li.textContent=t;list.append(li);});
    content.append(title,role,summary,heading,why,listHeading,list);
    if(window.matchMedia('(max-width: 900px)').matches)document.getElementById('service-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  pins.forEach(pin=>pin.addEventListener('click',()=>selectService(pin.dataset.service)));
  document.getElementById('panel-close').addEventListener('click',()=>{pins.forEach(p=>{p.classList.remove('is-active');p.setAttribute('aria-pressed','false');});content.innerHTML='<div class="empty-state"><span class="empty-icon" aria-hidden="true">✦</span><h2>Choose a location</h2><p>Select any labeled place on the map to explore the AWS services behind Cloudy Joe.</p></div>';});
  const journeys={website:{steps:[['Visitor',null],['Route 53','route53'],['CloudFront','cloudfront'],['S3','s3']],note:'This is the simplified website delivery path. ACM supplies the TLS certificate used by CloudFront.'},authenticated:{steps:[['Visitor',null],['Cognito','cognito'],['API Gateway','apigateway'],['Lambda','lambda'],['DynamoDB','dynamodb']],note:'Simplified example of an authenticated application request. The exact authorization checks depend on the API endpoint; Cognito authentication does not replace backend authorization.'}};
  const stepsEl=document.getElementById('journey-steps');const noteEl=document.getElementById('journey-note');
  function renderJourney(id){const journey=journeys[id];stepsEl.replaceChildren();journey.steps.forEach(([label,service],i)=>{if(i){const arrow=document.createElement('span');arrow.className='journey-arrow';arrow.textContent='→';arrow.setAttribute('aria-hidden','true');stepsEl.append(arrow);}const node=document.createElement(service?'button':'span');node.className='journey-node';node.textContent=label;if(service){node.type='button';node.addEventListener('click',()=>selectService(service));}stepsEl.append(node);});noteEl.textContent=journey.note;document.querySelectorAll('.journey-tab').forEach(tab=>{const active=tab.dataset.journey===id;tab.classList.toggle('is-active',active);tab.setAttribute('aria-pressed',String(active));});}
  document.querySelectorAll('.journey-tab').forEach(tab=>tab.addEventListener('click',()=>renderJourney(tab.dataset.journey)));renderJourney('website');
})();
