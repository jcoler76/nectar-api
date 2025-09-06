#!/bin/bash
set -e

# GitHub Self-Hosted Runner Setup Script
# Run this on a machine inside your VPN that can access both staging and production servers

RUNNER_VERSION="2.319.1"
GITHUB_OWNER="jcolermirabel"
GITHUB_REPO="mirabel-api"
RUNNER_NAME="vpn-runner-$(hostname)"

echo "🏃 Setting up GitHub Self-Hosted Runner for ${GITHUB_OWNER}/${GITHUB_REPO}"

# Create runner user
if ! id "github-runner" &>/dev/null; then
    echo "👤 Creating github-runner user..."
    sudo useradd -m -s /bin/bash github-runner
    sudo usermod -aG docker github-runner
fi

# Create runner directory
RUNNER_DIR="/home/github-runner/actions-runner"
sudo mkdir -p $RUNNER_DIR
sudo chown github-runner:github-runner $RUNNER_DIR

# Switch to runner user for setup
sudo -u github-runner bash << EOF
set -e
cd $RUNNER_DIR

# Download and extract runner
if [ ! -f "config.sh" ]; then
    echo "📥 Downloading GitHub Actions Runner..."
    curl -o actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz -L \
        https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
    
    tar xzf actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
    rm actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
fi

echo "✅ Runner downloaded and extracted"
EOF

# Create systemd service
sudo tee /etc/systemd/system/github-runner.service > /dev/null << EOF
[Unit]
Description=GitHub Actions Runner
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=github-runner
WorkingDirectory=/home/github-runner/actions-runner
ExecStart=/home/github-runner/actions-runner/run.sh
Restart=always
RestartSec=5
KillMode=process
KillSignal=SIGINT
TimeoutStopSec=5min

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

echo "✅ GitHub Runner setup completed!"
echo ""
echo "📝 Manual steps required:"
echo "1. Go to: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/settings/actions/runners"
echo "2. Click 'New self-hosted runner'"
echo "3. Select 'Linux' and 'x64'"
echo "4. Copy the registration token"
echo "5. Run as github-runner user:"
echo "   sudo -u github-runner /home/github-runner/actions-runner/config.sh \\"
echo "     --url https://github.com/${GITHUB_OWNER}/${GITHUB_REPO} \\"
echo "     --token YOUR_TOKEN \\"
echo "     --name ${RUNNER_NAME} \\"
echo "     --labels vpn,staging,production"
echo "6. Start the service:"
echo "   sudo systemctl enable github-runner"
echo "   sudo systemctl start github-runner"
echo ""
echo "🔒 Security Notes:"
echo "- This runner can access your VPN-protected servers"
echo "- Only use it for trusted repositories"
echo "- Consider restricting which workflows can use this runner"
