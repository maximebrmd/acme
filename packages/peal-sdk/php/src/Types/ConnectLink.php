<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ConnectLink extends JsonSerializableType
{
    /**
     * @var ?string $channelId
     */
    #[JsonProperty('channelId')]
    public ?string $channelId;

    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @var ?string $completedAt
     */
    #[JsonProperty('completedAt')]
    public ?string $completedAt;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public string $expiresAt;

    /**
     * @var ?string $failedAt
     */
    #[JsonProperty('failedAt')]
    public ?string $failedAt;

    /**
     * @var ?value-of<HostedConnectFailure> $failure
     */
    #[JsonProperty('failure')]
    public ?string $failure;

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
     * @var ?string $returnUrl
     */
    #[JsonProperty('returnUrl')]
    public ?string $returnUrl;

    /**
     * @var value-of<ConnectLinkStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @param array{
     *   channelIds: array<string>,
     *   createdAt: string,
     *   expiresAt: string,
     *   id: string,
     *   platform: value-of<Platform>,
     *   status: value-of<ConnectLinkStatus>,
     *   channelId?: ?string,
     *   completedAt?: ?string,
     *   failedAt?: ?string,
     *   failure?: ?value-of<HostedConnectFailure>,
     *   returnUrl?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'] ?? null;
        $this->channelIds = $values['channelIds'];
        $this->completedAt = $values['completedAt'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->expiresAt = $values['expiresAt'];
        $this->failedAt = $values['failedAt'] ?? null;
        $this->failure = $values['failure'] ?? null;
        $this->id = $values['id'];
        $this->platform = $values['platform'];
        $this->returnUrl = $values['returnUrl'] ?? null;
        $this->status = $values['status'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
