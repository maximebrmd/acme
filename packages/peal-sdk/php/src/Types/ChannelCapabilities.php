<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChannelCapabilities extends JsonSerializableType
{
    /**
     * @var AccountStanding $account
     */
    #[JsonProperty('account')]
    public AccountStanding $account;

    /**
     * @var PlatformCapabilities $capabilities
     */
    #[JsonProperty('capabilities')]
    public PlatformCapabilities $capabilities;

    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @param array{
     *   account: AccountStanding,
     *   capabilities: PlatformCapabilities,
     *   channelId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->account = $values['account'];
        $this->capabilities = $values['capabilities'];
        $this->channelId = $values['channelId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
