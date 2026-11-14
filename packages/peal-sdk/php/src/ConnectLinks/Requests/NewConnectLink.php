<?php

namespace Peal\ConnectLinks\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\ChannelConnection;
use Peal\Types\ConnectLinkLocale;
use Peal\Types\Platform;
use Peal\Core\Types\ArrayType;

class NewConnectLink extends JsonSerializableType
{
    /**
     * @var ?string $channelId
     */
    #[JsonProperty('channelId')]
    public ?string $channelId;

    /**
     * @var ?value-of<ChannelConnection> $connection
     */
    #[JsonProperty('connection')]
    public ?string $connection;

    /**
     * @var ?int $expiresInHours
     */
    #[JsonProperty('expiresInHours')]
    public ?int $expiresInHours;

    /**
     * @var ?value-of<ConnectLinkLocale> $locale
     */
    #[JsonProperty('locale')]
    public ?string $locale;

    /**
     * @var ?value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public ?string $platform;

    /**
     * @var ?array<value-of<Platform>> $platforms
     */
    #[JsonProperty('platforms'), ArrayType(['string'])]
    public ?array $platforms;

    /**
     * @var ?string $returnUrl
     */
    #[JsonProperty('returnUrl')]
    public ?string $returnUrl;

    /**
     * @param array{
     *   channelId?: ?string,
     *   connection?: ?value-of<ChannelConnection>,
     *   expiresInHours?: ?int,
     *   locale?: ?value-of<ConnectLinkLocale>,
     *   platform?: ?value-of<Platform>,
     *   platforms?: ?array<value-of<Platform>>,
     *   returnUrl?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->channelId = $values['channelId'] ?? null;
        $this->connection = $values['connection'] ?? null;
        $this->expiresInHours = $values['expiresInHours'] ?? null;
        $this->locale = $values['locale'] ?? null;
        $this->platform = $values['platform'] ?? null;
        $this->platforms = $values['platforms'] ?? null;
        $this->returnUrl = $values['returnUrl'] ?? null;
    }
}
