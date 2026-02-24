#!/bin/bash
# check-deploy.sh — Poll Railway deployment until SUCCESS or FAILED, then show logs on failure.

SERVICE_ID="44dbd4ba-bc88-40d7-9b22-341d79d485d5"
RAILWAY_TOKEN="0bc1ea88-4836-492d-b3d5-7a241aebff7c"
MAX_WAIT=300  # seconds
INTERVAL=10

gql() {
  curl -s -X POST https://backboard.railway.app/graphql/v2 \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$1"
}

echo "⏳ Waiting for Railway deployment..."
elapsed=0

while [ $elapsed -lt $MAX_WAIT ]; do
  result=$(gql "{\"query\":\"{ deployments(first: 1, input: { serviceId: \\\"$SERVICE_ID\\\" }) { edges { node { id status meta } } } }\"}")
  status=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['deployments']['edges'][0]['node']['status'])" 2>/dev/null)
  deploy_id=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['deployments']['edges'][0]['node']['id'])" 2>/dev/null)
  commit=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['deployments']['edges'][0]['node']['meta'].get('commitMessage','')[:60])" 2>/dev/null)

  echo "  [$elapsed s] $status — $commit"

  if [ "$status" = "SUCCESS" ]; then
    echo "✅ Deployed successfully!"
    exit 0
  fi

  if [ "$status" = "FAILED" ]; then
    echo "❌ Deploy FAILED. Fetching build logs..."
    gql "{\"query\":\"{ buildLogs(deploymentId: \\\"$deploy_id\\\") { message } }\"}" | \
      python3 -c "
import json,sys
d=json.load(sys.stdin)
logs=d.get('data',{}).get('buildLogs',[])
for l in logs:
    m=l.get('message','')
    if any(k in m for k in ['error','Error','ERROR','Failed','failed','Type','Cannot','✗','×']):
        print(m)
" 2>/dev/null | tail -30
    exit 1
  fi

  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))
done

echo "⏰ Timed out after ${MAX_WAIT}s. Check Railway dashboard."
exit 2
