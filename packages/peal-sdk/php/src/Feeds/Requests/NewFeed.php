<?php

namespace Peal\Feeds\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;
use Peal\Types\FeedMode;

class NewFeed extends JsonSerializableType
{
    /**
     * @var ?bool $attachPicture
     */
    #[JsonProperty('attachPicture')]
    public ?bool $attachPicture;

    /**
     * @var ?array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public ?array $channelIds;

    /**
     * @var ?string $channelSetId
     */
    #[JsonProperty('channelSetId')]
    public ?string $channelSetId;

    /**
     * @var ?value-of<FeedMode> $mode
     */
    #[JsonProperty('mode')]
    public ?string $mode;

    /**
     * @var ?string $queueId
     */
    #[JsonProperty('queueId')]
    public ?string $queueId;

    /**
     * @var ?string $template
     */
    #[JsonProperty('template')]
    public ?string $template;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @param array{
     *   url: string,
     *   attachPicture?: ?bool,
     *   channelIds?: ?array<string>,
     *   channelSetId?: ?string,
     *   mode?: ?value-of<FeedMode>,
     *   queueId?: ?string,
     *   template?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->attachPicture = $values['attachPicture'] ?? null;
        $this->channelIds = $values['channelIds'] ?? null;
        $this->channelSetId = $values['channelSetId'] ?? null;
        $this->mode = $values['mode'] ?? null;
        $this->queueId = $values['queueId'] ?? null;
        $this->template = $values['template'] ?? null;
        $this->url = $values['url'];
    }
}
