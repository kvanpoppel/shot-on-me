# Custom Hostname Setup

This project uses custom hostnames instead of `localhost` for a better development experience:
- **venueportal:3000** instead of `localhost:3000`
- **shotonme:3001** instead of `localhost:3001`

## Quick Setup

### Windows

1. **Run the hosts file setup script as Administrator:**
   ```powershell
   # Right-click PowerShell and select "Run as Administrator"
   .\setup-hosts.ps1
   ```

2. **The script will:**
   - Add `127.0.0.1 venueportal` to your hosts file
   - Add `127.0.0.1 shotonme` to your hosts file
   - Create a backup of your hosts file

3. **Start the applications:**
   ```powershell
   .\start-all.ps1
   ```

4. **Access the applications:**
   - Venue Portal: http://venueportal:3000
   - Shot On Me: http://shotonme:3001

### Manual Setup (Alternative)

If you prefer to manually edit the hosts file:

1. Open Notepad as Administrator
2. Navigate to: `C:\Windows\System32\drivers\etc\hosts`
3. Add these lines:
   ```
   127.0.0.1       venueportal
   127.0.0.1       shotonme
   ```
4. Save the file

## Troubleshooting

### "Cannot access the website"

- Make sure you ran `setup-hosts.ps1` as Administrator
- Verify the entries exist in your hosts file
- Flush your DNS cache:
  ```powershell
  ipconfig /flushdns
  ```

### "Access Denied" when running setup script

- You must run PowerShell as Administrator
- Right-click PowerShell → "Run as Administrator"

### Still can't access

- Try accessing via IP: `http://127.0.0.1:3000` or `http://127.0.0.1:3001`
- Check if the apps are actually running on those ports
- Verify your firewall isn't blocking the connections

## Reverting Changes

To remove the custom hostnames:

1. Open the hosts file as Administrator
2. Remove the lines containing `venueportal` and `shotonme`
3. Save the file
4. Flush DNS: `ipconfig /flushdns`

The hosts file backup created by the script will help you restore the original if needed.

