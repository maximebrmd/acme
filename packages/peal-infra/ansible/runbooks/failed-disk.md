# A failed disk

Production's two SSDs are mirrored by Linux software RAID: `md0` holds
`/boot` and `md1` holds `/`, each on a partition of both disks. Grafana
alerts on Telegram when an array is degraded (`peal-raid-degraded`: one of
its disks is gone and it runs on the other alone) and when a disk reports
that it is failing (`peal-disk-failing`: its SMART status says so, or a
prefail attribute is at its threshold). Either way the server still runs,
on borrowed time: on production's offer the provider does not replace a
disk, so the answer is to move to another server while this one still
serves, with nothing lost.

Run every command on the server, as `ops`, through the tunnel
(`ssh ops@ssh.peal.social`), unless a step says otherwise. Never fail, remove
or add a disk to see what happens: on a mirror whose disks cannot be
replaced, that is the incident.

## Check it reports

Once after `site.yml` sets a server up, and after any change to the
`peal_disks` role, since no alert says when the reports stop (a server
without the role sends none, and the rules must stay quiet there):

1. The timer is waiting, and the last run succeeded:

   ```sh
   systemctl list-timers 'peal-disk-health*'
   systemctl status peal-disk-health
   ```

2. In Grafana's Explore, on Prometheus, `peal_host_raid_arrays`,
   `peal_host_raid_degraded` and `peal_host_disks_failing` each have a point
   in the last 15 minutes: on production, two arrays, none degraded, no disk
   failing; on the sandbox's virtual machine, all three zero.
3. The disks' baseline, for the owner's notes: power-on hours, reallocated
   and pending sectors, and the lifetime left, read from

   ```sh
   sudo smartctl -a /dev/sda
   sudo smartctl -a /dev/sdb
   ```

   Reallocated or pending sectors, or little life left, are for the
   provider before customers depend on the server.

## When an alert fires

1. **Read the state.** In `/proc/mdstat`, a whole mirror shows `[UU]`; a
   missing member `[U_]`, and a failed one `(F)` after its partition.
   `mdadm --detail` names the array's members and which is `faulty` or
   `removed`:

   ```sh
   cat /proc/mdstat
   sudo mdadm --detail /dev/md0
   sudo mdadm --detail /dev/md1
   sudo smartctl -a /dev/sda
   sudo smartctl -a /dev/sdb
   ```

   For the provider's ticket, the disks by slot, with their models and
   serial numbers:

   ```sh
   lsblk --paths --sort HCTL --output hctl,name,size,model,rev,serial,tran,phy-sec --bytes
   ```

   Keep the outputs, for the ticket and the incident's record. The serial
   numbers stay there and in the ticket: no alert or metric carries them.

2. **Take a full backup now**, while both the database and the remaining
   disk answer, and check that it is listed:

   ```sh
   sudo systemctl start peal-backup@full
   sudo peal-compose exec --user postgres postgres pgbackrest info
   ```

   The write-ahead log keeps reaching the bucket every 5 minutes at most
   whatever happens next; this backup makes the restore short.

3. **Open a ticket with the provider**, with the outputs of step 1 and
   which disk is failing. On production's offer the provider does not
   replace a disk (the server shares its chassis with others): expect
   another server, not a repair, and ask what the move costs and how soon a
   server can be had.

   Where an offer does replace disks, the array is rebuilt on the new disk
   after the swap: its partition table copied from the good disk, each
   partition added back to its array with `mdadm --add`, and the boot
   loader installed on the new disk. Production cannot use that, so this
   runbook names it without spelling it out.

   Do not reboot the server by hand meanwhile. A mirror boots on its
   remaining disk, but that has never been tried on this server and will
   not be. The nightly reboot a kernel update asks for is held while an
   array is degraded: `journalctl --unit peal-reboot` says `a reboot is
   pending, held while md1 is degraded`, and the server keeps running its
   old kernel, without that update's fixes, one more reason to move within
   days.

4. **Move to a new server.** While the old server still runs, follow
   [A planned move](restore-database.md#a-planned-move): it carries
   `secrets.env`, so nobody signs in again and every channel keeps working.
   If the old server no longer runs, or loses the second disk before the
   move, follow [A new server](restore-database.md#a-new-server) instead:
   it generates new secrets, and then everyone signs in again, the command
   line and MCP clients too, and members reconnect every channel.

   Either way, the new server's address goes in
   `host_vars/peal-production/local.yml` (off Git), and, if it is at
   another provider or in another city, `hosting_provider` and
   `hosting_location` in `group_vars/production/main.yml`, which must still
   differ from the uptime server's. Then [Check it reports](#check-it-reports)
   on the new server, with the baseline of its own disks.

5. **Wipe the old server and give it back.** Once the new one serves and
   has its first backup, the old disks still hold the database and the
   logs. From the provider's rescue system, erase each disk that still
   answers with its own secure erase (ATA Secure Erase), which needs the
   disk `not frozen` in `hdparm -I` and a temporary password the erase
   clears:

   ```sh
   sudo hdparm -I /dev/sda | grep frozen
   sudo hdparm --user-master u --security-set-pass erase /dev/sda
   sudo hdparm --user-master u --security-erase erase /dev/sda
   ```

   and the same for `/dev/sdb`. Ask the provider, in the ticket, to destroy
   a disk that no longer answers. Then cancel the server at the provider.

6. **After.** In the incident's record: the outputs of step 1, the
   ticket's number and answer, the times of the backup, the move and the
   first backup on the new server, and the new disks' baseline.
