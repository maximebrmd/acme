<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Channel extends JsonSerializableType
{
    /**
     * @var ?string $avatarUrl
     */
    #[JsonProperty('avatarUrl')]
    public ?string $avatarUrl;

    /**
     * @var ?value-of<InstagramConnection> $connection
     */
    #[JsonProperty('connection')]
    public ?string $connection;

    /**
     * @var ?string $displayName
     */
    #[JsonProperty('displayName')]
    public ?string $displayName;

    /**
     * @var string $handle
     */
    #[JsonProperty('handle')]
    public string $handle;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @var ChannelStatus $status
     */
    #[JsonProperty('status')]
    public ChannelStatus $status;

    /**
     * @var ?string $tokenExpiresAt
     */
    #[JsonProperty('tokenExpiresAt')]
    public ?string $tokenExpiresAt;

    /**
     * @param array{
     *   handle: string,
     *   id: string,
     *   platform: value-of<Platform>,
     *   status: ChannelStatus,
     *   avatarUrl?: ?string,
     *   connection?: ?value-of<InstagramConnection>,
     *   displayName?: ?string,
     *   tokenExpiresAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->avatarUrl = $values['avatarUrl'] ?? null;
        $this->connection = $values['connection'] ?? null;
        $this->displayName = $values['displayName'] ?? null;
        $this->handle = $values['handle'];
        $this->id = $values['id'];
        $this->platform = $values['platform'];
        $this->status = $values['status'];
        $this->tokenExpiresAt = $values['tokenExpiresAt'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
