import { useState } from "react";
import "./App.css";

interface GenerateKeyResponse {
  cacrt: string;
  crt: string;
  key: string;
  message?: string;
}

function App() {
  const [clientName, setClientName] = useState<string>("");
  const [IP, setIP] = useState<string>("");
  const [groups, setGroups] = useState<string>("");

  const [cacrt, setCACrt] = useState<string>();
  const [crt, setCrt] = useState<string>();
  const [key, setKey] = useState<string>();

  const [errorMessage, setErrorMessage] = useState<string>();

  const generateKey = async (
    clientName: string,
    ip: string,
    groups: string
  ) => {
    if (clientName === "" || ip === "" || groups === "") {
      setCACrt("");
      setCrt("");
      setKey("");
      setErrorMessage("Invalid input");
      return;
    }
    const response = await fetch("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        client_name: clientName,
        ip: ip,
        groups: groups,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const generateKey: GenerateKeyResponse = await response.json();
    if (generateKey.message) {
      setErrorMessage(generateKey.message);
      return;
    }
    setCACrt(generateKey.cacrt);
    setCrt(generateKey.crt);
    setKey(generateKey.key);
    setErrorMessage("");
  };

  return (
    <div className="App">
      <h1>Nebula Admin Panel</h1>
      <h2>Provision a new client</h2>
      <div className="card">
        <span className="card-label">Client Name: </span>
        <input
          className="card-input"
          type="text"
          onChange={(e) => {
            setClientName(e.target.value);
          }}
        />
      </div>
      <div className="card">
        <span className="card-label">IP Address + CIDR: </span>
        <input
          className="card-input"
          type="text"
          onChange={(e) => {
            setIP(e.target.value);
          }}
        />
      </div>
      <div className="card">
        <span className="card-label">Groups (comma separated): </span>
        <input
          className="card-input"
          type="text"
          onChange={(e) => {
            setGroups(e.target.value);
          }}
        />
      </div>
      <div className="card-center">
        <button onClick={() => generateKey(clientName, IP, groups)}>
          Submit
        </button>
      </div>
      {errorMessage && <pre className="error">{errorMessage}</pre>}
      {crt && key && (
        <div>
          <span>ca.crt: </span>
          <pre>{cacrt}</pre>
          <p></p>
          <span>host.crt: </span>
          <pre>{crt}</pre>
          <p></p>
          <span>host.key: </span>
          <pre>{key}</pre>
          <p></p>
          <span>nebula.service: </span>
          <pre>{`[Unit]
Description=nebula
Wants=basic.target
After=basic.target network.target
Before=sshd.service

[Service]
SyslogIdentifier=nebula
ExecReload=/bin/kill -HUP $MAINPID
ExecStart=/usr/local/bin/nebula -config /etc/nebula/config.yml
Restart=always

[Install]
WantedBy=multi-user.target
`}</pre>
          <p></p>
          <span>config.yml: </span>
          <pre>{`# This is the nebula example configuration file. You must edit, at a minimum, the static_host_map, lighthouse, and firewall sections
# Some options in this file are HUPable, including the pki section. (A HUP will reload credentials from disk without affecting existing tunnels)

# PKI defines the location of credentials for this node. Each of these can also be inlined by using the yaml ": |" syntax.
pki:
  # The CAs that are accepted by this node. Must contain one or more certificates created by 'nebula-cert ca'
  ca: /etc/nebula/ca.crt
  cert: /etc/nebula/host.crt
  key: /etc/nebula/host.key
  # blocklist is a list of certificate fingerprints that we will refuse to talk to
  #blocklist:
  #  - c99d4e650533b92061b09918e838a5a0a6aaee21eed1d12fd937682865936c72
  # disconnect_invalid is a toggle to force a client to be disconnected if the certificate is expired or invalid.
  #disconnect_invalid: false

# The static host map defines a set of hosts with fixed IP addresses on the internet (or any network).
# A host can have multiple fixed IP addresses defined here, and nebula will try each when establishing a tunnel.
# The syntax is:
#   "{nebula ip}": ["{routable ip/dns name}:{routable port}"]
# Example, if your lighthouse has the nebula IP of 192.168.100.1 and has the real ip address of 100.64.22.11 and runs on port 4242:
static_host_map:
  "10.99.99.1": ["172.105.3.165:4242"]


lighthouse:
  # am_lighthouse is used to enable lighthouse functionality for a node. This should ONLY be true on nodes
  # you have configured to be lighthouses in your network
  am_lighthouse: false
  # serve_dns optionally starts a dns listener that responds to various queries and can even be
  # delegated to for resolution
  #serve_dns: false
  #dns:
    # The DNS host defines the IP to bind the dns listener to. This also allows binding to the nebula node IP.
    #host: 0.0.0.0
    #port: 53
  # interval is the number of seconds between updates from this node to a lighthouse.
  # during updates, a node sends information about its current IP addresses to each node.
  interval: 60
  # hosts is a list of lighthouse hosts this node should report to and query from
  # IMPORTANT: THIS SHOULD BE EMPTY ON LIGHTHOUSE NODES
  # IMPORTANT2: THIS SHOULD BE LIGHTHOUSES' NEBULA IPs, NOT LIGHTHOUSES' REAL ROUTABLE IPs
  hosts:
    - "10.99.99.1"

  # remote_allow_list allows you to control ip ranges that this node will
  # consider when handshaking to another node. By default, any remote IPs are
  # allowed. You can provide CIDRs here with \`true\` to allow and \`false\` to
  # deny. The most specific CIDR rule applies to each remote. If all rules are
  # "allow", the default will be "deny", and vice-versa. If both "allow" and
  # "deny" rules are present, then you MUST set a rule for "0.0.0.0/0" as the
  # default.
  #remote_allow_list:
    # Example to block IPs from this subnet from being used for remote IPs.
    #"172.16.0.0/12": false

    # A more complicated example, allow public IPs but only private IPs from a specific subnet
    #"0.0.0.0/0": true
    #"10.0.0.0/8": false
    #"10.42.42.0/24": true

  # EXPERIMENTAL: This option my change or disappear in the future.
  # Optionally allows the definition of remote_allow_list blocks
  # specific to an inside VPN IP CIDR.
  #remote_allow_ranges:
    # This rule would only allow only private IPs for this VPN range
    #"10.42.42.0/24":
      #"192.168.0.0/16": true

  # local_allow_list allows you to filter which local IP addresses we advertise
  # to the lighthouses. This uses the same logic as \`remote_allow_list\`, but
  # additionally, you can specify an \`interfaces\` map of regular expressions
  # to match against interface names. The regexp must match the entire name.
  # All interface rules must be either true or false (and the default will be
  # the inverse). CIDR rules are matched after interface name rules.
  # Default is all local IP addresses.
  #local_allow_list:
    # Example to block tun0 and all docker interfaces.
    #interfaces:
      #tun0: false
      #'docker.*': false
    # Example to only advertise this subnet to the lighthouse.
    #"10.0.0.0/8": true

  # advertise_addrs are routable addresses that will be included along with discovered addresses to report to the
  # lighthouse, the format is "ip:port". \`port\` can be \`0\`, in which case the actual listening port will be used in its
  # place, useful if \`listen.port\` is set to 0.
  # This option is mainly useful when there are static ip addresses the host can be reached at that nebula can not
  # typically discover on its own. Examples being port forwarding or multiple paths to the internet.
  #advertise_addrs:
    #- "1.1.1.1:4242"
    #- "1.2.3.4:0" # port will be replaced with the real listening port

# Port Nebula will be listening on. The default here is 4242. For a lighthouse node, the port should be defined,
# however using port 0 will dynamically assign a port and is recommended for roaming nodes.
listen:
  # To listen on both any ipv4 and ipv6 use "[::]"
  host: 0.0.0.0
  port: 4242
  # Sets the max number of packets to pull from the kernel for each syscall (under systems that support recvmmsg)
  # default is 64, does not support reload
  #batch: 64
  # Configure socket buffers for the udp side (outside), leave unset to use the system defaults. Values will be doubled by the kernel
  # Default is net.core.rmem_default and net.core.wmem_default (/proc/sys/net/core/rmem_default and /proc/sys/net/core/rmem_default)
  # Maximum is limited by memory in the system, SO_RCVBUFFORCE and SO_SNDBUFFORCE is used to avoid having to raise the system wide
  # max, net.core.rmem_max and net.core.wmem_max
  #read_buffer: 10485760
  #write_buffer: 10485760
  # By default, Nebula replies to packets it has no tunnel for with a "recv_error" packet. This packet helps speed up reconnection
  # in the case that Nebula on either side did not shut down cleanly. This response can be abused as a way to discover if Nebula is running
  # on a host though. This option lets you configure if you want to send "recv_error" packets always, never, or only to private network remotes.
  # valid values: always, never, private
  # This setting is reloadable.
  #send_recv_error: always

# Routines is the number of thread pairs to run that consume from the tun and UDP queues.
# Currently, this defaults to 1 which means we have 1 tun queue reader and 1
# UDP queue reader. Setting this above one will set IFF_MULTI_QUEUE on the tun
# device and SO_REUSEPORT on the UDP socket to allow multiple queues.
# This option is only supported on Linux.
#routines: 1

punchy:
  # Continues to punch inbound/outbound at a regular interval to avoid expiration of firewall nat mappings
  punch: true

  # respond means that a node you are trying to reach will connect back out to you if your hole punching fails
  # this is extremely useful if one node is behind a difficult nat, such as a symmetric NAT
  # Default is false
  #respond: true

  # delays a punch response for misbehaving NATs, default is 1 second, respond must be true to take effect
  #delay: 1s

# Cipher allows you to choose between the available ciphers for your network. Options are chachapoly or aes
# IMPORTANT: this value must be identical on ALL NODES/LIGHTHOUSES. We do not/will not support use of different ciphers simultaneously!
#cipher: chachapoly

# Preferred ranges is used to define a hint about the local network ranges, which speeds up discovering the fastest
# path to a network adjacent nebula node.
# NOTE: the previous option "local_range" only allowed definition of a single range
# and has been deprecated for "preferred_ranges"
#preferred_ranges: ["172.16.0.0/24"]

# sshd can expose informational and administrative functions via ssh this is a
#sshd:
  # Toggles the feature
  #enabled: true
  # Host and port to listen on, port 22 is not allowed for your safety
  #listen: 127.0.0.1:2222
  # A file containing the ssh host private key to use
  # A decent way to generate one: ssh-keygen -t ed25519 -f ssh_host_ed25519_key -N "" < /dev/null
  #host_key: ./ssh_host_ed25519_key
  # A file containing a list of authorized public keys
  #authorized_users:
    #- user: steeeeve
      # keys can be an array of strings or single string
      #keys:
        #- "ssh public key string"

# EXPERIMENTAL: relay support for networks that can't establish direct connections.
relay:
  # Relays are a list of Nebula IP's that peers can use to relay packets to me.
  # IPs in this list must have am_relay set to true in their configs, otherwise
  # they will reject relay requests.
  #relays:
    #- 192.168.100.1
    #- <other Nebula VPN IPs of hosts used as relays to access me>
  # Set am_relay to true to permit other hosts to list my IP in their relays config. Default false.
  am_relay: false
  # Set use_relays to false to prevent this instance from attempting to establish connections through relays.
  # default true
  use_relays: true

# Configure the private interface. Note: addr is baked into the nebula certificate
tun:
  # When tun is disabled, a lighthouse can be started without a local tun interface (and therefore without root)
  disabled: false
  # Name of the device. If not set, a default will be chosen by the OS.
  # For macOS: if set, must be in the form \`utun[0-9]+\`.
  # For FreeBSD: Required to be set, must be in the form \`tun[0-9]+\`.
  dev: nebula1
  # Toggles forwarding of local broadcast packets, the address of which depends on the ip/mask encoded in pki.cert
  drop_local_broadcast: false
  # Toggles forwarding of multicast packets
  drop_multicast: false
  # Sets the transmit queue length, if you notice lots of transmit drops on the tun it may help to raise this number. Default is 500
  tx_queue: 500
  # Default MTU for every packet, safe setting is (and the default) 1300 for internet based traffic
  mtu: 1300
  # Route based MTU overrides, you have known vpn ip paths that can support larger MTUs you can increase/decrease them here
  routes:
    #- mtu: 8800
    #  route: 10.0.0.0/16
  # Unsafe routes allows you to route traffic over nebula to non-nebula nodes
  # Unsafe routes should be avoided unless you have hosts/services that cannot run nebula
  # NOTE: The nebula certificate of the "via" node *MUST* have the "route" defined as a subnet in its certificate
  # \`mtu\` will default to tun mtu if this option is not specified
  # \`metric\` will default to 0 if this option is not specified
  unsafe_routes:
    #- route: 172.16.1.0/24
    #  via: 192.168.100.99
    #  mtu: 1300
    #  metric: 100


# TODO
# Configure logging level
logging:
  # panic, fatal, error, warning, info, or debug. Default is info
  level: info
  # json or text formats currently available. Default is text
  format: text
  # Disable timestamp logging. useful when output is redirected to logging system that already adds timestamps. Default is false
  #disable_timestamp: true
  # timestamp format is specified in Go time format, see:
  #     https://golang.org/pkg/time/#pkg-constants
  # default when \`format: json\`: "2006-01-02T15:04:05Z07:00" (RFC3339)
  # default when \`format: text\`:
  #     when TTY attached: seconds since beginning of execution
  #     otherwise: "2006-01-02T15:04:05Z07:00" (RFC3339)
  # As an example, to log as RFC3339 with millisecond precision, set to:
  #timestamp_format: "2006-01-02T15:04:05.000Z07:00"

#stats:
  #type: graphite
  #prefix: nebula
  #protocol: tcp
  #host: 127.0.0.1:9999
  #interval: 10s

  #type: prometheus
  #listen: 127.0.0.1:8080
  #path: /metrics
  #namespace: prometheusns
  #subsystem: nebula
  #interval: 10s

  # enables counter metrics for meta packets
  #   e.g.: \`messages.tx.handshake\`
  # NOTE: \`message.{tx,rx}.recv_error\` is always emitted
  #message_metrics: false

  # enables detailed counter metrics for lighthouse packets
  #   e.g.: \`lighthouse.rx.HostQuery\`
  #lighthouse_metrics: false

# Handshake Manager Settings
#handshakes:
  # Handshakes are sent to all known addresses at each interval with a linear backoff,
  # Wait try_interval after the 1st attempt, 2 * try_interval after the 2nd, etc, until the handshake is older than timeout
  # A 100ms interval with the default 10 retries will give a handshake 5.5 seconds to resolve before timing out
  #try_interval: 100ms
  #retries: 20
  # trigger_buffer is the size of the buffer channel for quickly sending handshakes
  # after receiving the response for lighthouse queries
  #trigger_buffer: 64


# Nebula security group configuration
firewall:
  conntrack:
    tcp_timeout: 12m
    udp_timeout: 3m
    default_timeout: 10m

  # The firewall is default deny. There is no way to write a deny rule.
  # Rules are comprised of a protocol, port, and one or more of host, group, or CIDR
  # Logical evaluation is roughly: port AND proto AND (ca_sha OR ca_name) AND (host OR group OR groups OR cidr)
  # - port: Takes \`0\` or \`any\` as any, a single number \`80\`, a range \`200-901\`, or \`fragment\` to match second and further fragments of fragmented packets (since there is no port available).
  #   code: same as port but makes more sense when talking about ICMP, TODO: this is not currently implemented in a way that works, use \`any\`
  #   proto: \`any\`, \`tcp\`, \`udp\`, or \`icmp\`
  #   host: \`any\` or a literal hostname, ie \`test-host\`
  #   group: \`any\` or a literal group name, ie \`default-group\`
  #   groups: Same as group but accepts a list of values. Multiple values are AND'd together and a certificate would have to contain all groups to pass
  #   cidr: a CIDR, \`0.0.0.0/0\` is any.
  #   ca_name: An issuing CA name
  #   ca_sha: An issuing CA shasum

  outbound:
    # Allow all outbound traffic from this node
    - port: any
      proto: any
      host: any

  inbound:
    # Allow icmp between any nebula hosts
    - port: any
      proto: icmp
      host: any
`}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
