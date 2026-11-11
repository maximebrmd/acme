namespace Peal;

public partial interface IQueuesClient
{
    /// <summary>
    /// Lists the workspace's queues, the default first, then by name, each with its slots, its channels and those of them disconnected since (`unavailableChannelIds`). Needs post:read and channel:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<Queue>> ListAsync(
        ListQueuesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Saves a queue. A slot is a weekday and a time of day (`HH:mm`) in the queue's IANA time zone, each pair once, 100 at most: a time daylight saving skips moves to the moment the clocks jump, and a time it repeats happens once. A queue may be for some of the workspace's channels (`channelIds`, connected ones, 50 at most) and one channel set (`channelSetId`), which a post added to it goes to when it names none. Its name is one no other queue of the workspace has, whatever its case. `isDefault` makes it the workspace's default queue, the one a post added to no queue in particular takes, instead of the one that was. The first queue of a workspace is its default. A workspace keeps 20 queues at most. Needs post:update and channel:read.
    /// </summary>
    WithRawResponseTask<Queue> CreateAsync(
        CreateQueuesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers with a queue of the workspace. Needs post:read and channel:read.
    /// </summary>
    WithRawResponseTask<Queue> GetAsync(
        GetQueuesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces a queue's name, zone, slots and channels: every channel must be connected now, so this is also how a disconnected one is taken out. A slot is a weekday and a time of day (`HH:mm`) in the queue's IANA time zone, each pair once, 100 at most: a time daylight saving skips moves to the moment the clocks jump, and a time it repeats happens once. A queue may be for some of the workspace's channels (`channelIds`, connected ones, 50 at most) and one channel set (`channelSetId`), which a post added to it goes to when it names none. Its name is one no other queue of the workspace has, whatever its case. `isDefault` makes it the workspace's default queue, the one a post added to no queue in particular takes, instead of the one that was. Posts the queue placed keep their times: a slot that changed frees nothing and moves nothing. Saving the default with `isDefault` false leaves the workspace without one. Needs post:update and channel:read.
    /// </summary>
    WithRawResponseTask<Queue> UpdateAsync(
        UpdateQueuesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes a queue. The posts it placed stay scheduled at their times, and no longer name it (`queueId` null). Deleting the default leaves the workspace without one until another is made default. Needs post:update.
    /// </summary>
    WithRawResponseTask DeleteAsync(
        DeleteQueuesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the queue's next `count` slots after now (10 unless given, 50 at most), each with the post that holds it, or null, and `nextFree`, the slot a post added now would take, which may come after them; null with `noRoom` when there is none: the queue has no slot (`noSlots`), or every slot of the next 366 days is taken (`full`). A slot is taken while a post the queue placed is scheduled, awaiting approval or publishing at exactly that instant. The preview holds nothing: the slot is decided when the post is added. Needs post:read.
    /// </summary>
    WithRawResponseTask<QueuePreview> SlotsAsync(
        SlotsQueuesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
