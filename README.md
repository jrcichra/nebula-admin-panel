# nebula-admin-panel

A web gui for admins to provision new clients on the nebula network. Expected to be secured within nebula.

# Firewall

Example rule for host running admin panel:

```
    # Allow admins to provision new users
    - port: 8000
      proto: tcp
      groups:
        - admins
```

# Screenshots

![nebula admin page](screenshots/1.png)

# Usage

```
nebula-admin-panel 0.1.0

USAGE:
    nebula-admin-panel [OPTIONS]

OPTIONS:
        --ca-crt <CA_CRT>    Path to the signing CA cert [default: ca.crt]
        --ca-key <CA_KEY>    Path to the signing CA cert [default: ca.key]
    -h, --help               Print help information
    -V, --version            Print version information
```
