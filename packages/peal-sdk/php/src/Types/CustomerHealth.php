<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CustomerHealth extends JsonSerializableType
{
    /**
     * @var ?OverviewChannels $channels
     */
    #[JsonProperty('channels')]
    public ?OverviewChannels $channels;

    /**
     * @var ?string $externalId
     */
    #[JsonProperty('externalId')]
    public ?string $externalId;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?OverviewInbox $inbox
     */
    #[JsonProperty('inbox')]
    public ?OverviewInbox $inbox;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?OverviewPosts $posts
     */
    #[JsonProperty('posts')]
    public ?OverviewPosts $posts;

    /**
     * @param array{
     *   id: string,
     *   name: string,
     *   channels?: ?OverviewChannels,
     *   externalId?: ?string,
     *   inbox?: ?OverviewInbox,
     *   posts?: ?OverviewPosts,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channels = $values['channels'] ?? null;
        $this->externalId = $values['externalId'] ?? null;
        $this->id = $values['id'];
        $this->inbox = $values['inbox'] ?? null;
        $this->name = $values['name'];
        $this->posts = $values['posts'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
