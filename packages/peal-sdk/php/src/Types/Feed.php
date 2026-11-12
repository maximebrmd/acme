<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Feed extends JsonSerializableType
{
    /**
     * @var bool $attachPicture
     */
    #[JsonProperty('attachPicture')]
    public bool $attachPicture;

    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @var ?string $channelSetId
     */
    #[JsonProperty('channelSetId')]
    public ?string $channelSetId;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?string $failingSince
     */
    #[JsonProperty('failingSince')]
    public ?string $failingSince;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $lastCheckedAt
     */
    #[JsonProperty('lastCheckedAt')]
    public ?string $lastCheckedAt;

    /**
     * @var ?value-of<FeedFailure> $lastFailure
     */
    #[JsonProperty('lastFailure')]
    public ?string $lastFailure;

    /**
     * @var value-of<FeedMode> $mode
     */
    #[JsonProperty('mode')]
    public string $mode;

    /**
     * @var string $nextCheckAt
     */
    #[JsonProperty('nextCheckAt')]
    public string $nextCheckAt;

    /**
     * @var ?string $queueId
     */
    #[JsonProperty('queueId')]
    public ?string $queueId;

    /**
     * @var string $since
     */
    #[JsonProperty('since')]
    public string $since;

    /**
     * @var ?string $startedBy
     */
    #[JsonProperty('startedBy')]
    public ?string $startedBy;

    /**
     * @var PostOrigin $startedVia
     */
    #[JsonProperty('startedVia')]
    public PostOrigin $startedVia;

    /**
     * @var value-of<FeedStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?string $statusAt
     */
    #[JsonProperty('statusAt')]
    public ?string $statusAt;

    /**
     * @var ?value-of<FeedStoppedReason> $stopReason
     */
    #[JsonProperty('stopReason')]
    public ?string $stopReason;

    /**
     * @var string $template
     */
    #[JsonProperty('template')]
    public string $template;

    /**
     * @var ?string $title
     */
    #[JsonProperty('title')]
    public ?string $title;

    /**
     * @var string $updatedAt
     */
    #[JsonProperty('updatedAt')]
    public string $updatedAt;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @param array{
     *   attachPicture: bool,
     *   channelIds: array<string>,
     *   createdAt: string,
     *   id: string,
     *   mode: value-of<FeedMode>,
     *   nextCheckAt: string,
     *   since: string,
     *   startedVia: PostOrigin,
     *   status: value-of<FeedStatus>,
     *   template: string,
     *   updatedAt: string,
     *   url: string,
     *   channelSetId?: ?string,
     *   failingSince?: ?string,
     *   lastCheckedAt?: ?string,
     *   lastFailure?: ?value-of<FeedFailure>,
     *   queueId?: ?string,
     *   startedBy?: ?string,
     *   statusAt?: ?string,
     *   stopReason?: ?value-of<FeedStoppedReason>,
     *   title?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->attachPicture = $values['attachPicture'];
        $this->channelIds = $values['channelIds'];
        $this->channelSetId = $values['channelSetId'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->failingSince = $values['failingSince'] ?? null;
        $this->id = $values['id'];
        $this->lastCheckedAt = $values['lastCheckedAt'] ?? null;
        $this->lastFailure = $values['lastFailure'] ?? null;
        $this->mode = $values['mode'];
        $this->nextCheckAt = $values['nextCheckAt'];
        $this->queueId = $values['queueId'] ?? null;
        $this->since = $values['since'];
        $this->startedBy = $values['startedBy'] ?? null;
        $this->startedVia = $values['startedVia'];
        $this->status = $values['status'];
        $this->statusAt = $values['statusAt'] ?? null;
        $this->stopReason = $values['stopReason'] ?? null;
        $this->template = $values['template'];
        $this->title = $values['title'] ?? null;
        $this->updatedAt = $values['updatedAt'];
        $this->url = $values['url'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
