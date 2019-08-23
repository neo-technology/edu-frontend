from base64 import b64encode
import json
import requests
import sys, getopt
import os
import boto3
import flask
from flask import render_template

fapp = flask.Flask('pub', template_folder='.')

API_BASE_URL = {"dev": "https://34um3gz3l1.execute-api.us-east-1.amazonaws.com/dev/",
                "prod": "https://????.execute-api.us-east-1.amazonaws.com/prod/"}

LANDING_PAGE = {"dev": 102247,
                "prod": 102244}

LICENSE_PAGE = {"dev": 102275,
                "prod": 102268}

'''
Publish file to S3 and get version
'''
def publish_app_js(stage):
  global API_BASE_URL

  # Create an S3 client
  s3 = boto3.client('s3')

  with fapp.app_context():
    tmpl_vars = {'API_BASE_URL': API_BASE_URL[stage]}
    rendered_content = render_template('js/app.js', **tmpl_vars)
  f = s3.put_object(Body=bytes(rendered_content), Bucket='cdn.neo4jlabs.com', Key='edu-program/' + stage + '/app.js', ACL='public-read')
  return f['VersionId']

def get_latest_license(key):
  # Create an S3 client
  s3 = boto3.client('s3')
  bucket = 'cdn.neo4jlabs.com'
  f = s3.head_object(Bucket=bucket, Key=key)
  return 'https://s3.amazonaws.com/%s/%s?versionId=%s' % (bucket, key, str(f['VersionId']))

def get_latest_neo4j_inc_license():
  #Note - fix this!
  return get_latest_license('edu-program/neo4j-edu-licenses/test.pdf')

'''
Publish file to S3 and get version
'''
def publish_view_license_js(stage):
  # Create an S3 client
  s3 = boto3.client('s3')
  with fapp.app_context():
    tmpl_vars = {'API_BASE_URL': API_BASE_URL[stage]}
    rendered_content = render_template('js/view-license.js', **tmpl_vars)
  f = s3.put_object(Body=bytes(rendered_content), Bucket='cdn.neo4jlabs.com', Key='edu-program/' + stage + '/view-license.js', ACL='public-read')
  return f['VersionId']


'''
Get page content
'''
def get_page_content(filename):
  file = open('html/%s' % filename)
  return file.read()

'''
Update wordpress page
'''
def update_wordpress_page(pageId, content):
    url = 'https://neo4j.com/wp-json/wp/v2/pages/%d' % (pageId)
    auth = b64encode('{}:{}'.format(os.getenv('PUBLISH_DOCS_USERNAME'), os.getenv('PUBLISH_DOCS_PASSWORD')))
    headers = {
        'Accept': 'application/json',
        'Authorization': 'Basic {}'.format(auth),
    }

    r = requests.get(url, headers=headers)
    response = json.loads(r.content)

    # build response for update
    response['content'] = content
    headers['Content-Type'] = 'application/json'
    print url
    pr = requests.post(url, headers=headers, data=json.dumps(response))

    return pr.content


def main(argv):
  stage = 'dev'
  try:
     opts, args = getopt.getopt(argv,"h",['stage='])
  except getopt.GetoptError:
     print 'publish.py --stage <stage>'
     sys.exit(2)
  for opt, arg in opts:
     if opt == '-h':
        print 'publish.py --stage <stage>'
        sys.exit()
     elif opt in ("--stage"):
        stage = arg
  print 'Stage is "%s"' % (stage)

  if stage <> 'dev' and stage <> 'prod':
    print "Stages 'prod' + 'dev' are only supported stages currently"
    sys.exit()

  if 'PUBLISH_DOCS_USERNAME' in os.environ and 'PUBLISH_DOCS_PASSWORD' in os.environ:
    # publish new JS
    appVersionId = publish_app_js(stage)
    viewLicenseVersionId = publish_view_license_js(stage)

    # publish wordpress page, replacing version of JS with latest published
    with fapp.app_context():
      tmpl_vars = {'js_location': 'https://cdn.neo4jlabs.com/edu-program/' + stage + '/app.js', 'js_version': appVersionId, 'neo4j_inc_license_url': get_latest_neo4j_inc_license()}
      rendered_content = render_template('html/index.html', **tmpl_vars)
      pageContent = update_wordpress_page(LANDING_PAGE[stage], rendered_content)

      tmpl_vars = {'js_location': 'https://cdn.neo4jlabs.com/edu-program/' + stage + '/view-license.js', 'js_version': viewLicenseVersionId}
      rendered_content = render_template('html/view-license.html', **tmpl_vars)
      pageContent = update_wordpress_page(LICENSE_PAGE[stage], rendered_content)
  else:
    print "Environment variables for PUBLISH_DOCS_USERNAME and PUBLISH_DOCS_PASSWORD must be set"
    sys.exit()

if __name__ == "__main__":
   main(sys.argv[1:])
