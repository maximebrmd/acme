<?php

namespace Peal\ConnectLinks\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\InstagramConnection;
use Peal\Types\ConnectLinkLocale;
use Peal\Types\Platform;

class NewConnectLink extends JsonSerializableType
{
    /**
     * @var ?string $channelId
     */
    #[JsonProperty('channelId')]
    public ?string $channelId;

    /**
     * @var ?value-of<InstagramConnection> $connection
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
     * @param array{
     *   platform: value-of<Platform>,
     *   channelId?: ?string,
     *   connection?: ?value-of<InstagramConnection>,
     *   expiresInHours?: ?int,
     *   locale?: ?value-of<ConnectLinkLocale>,
     *   returnUrl?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'] ?? null;
        $this->connection = $values['connection'] ?? null;
        $this->expiresInHours = $values['expiresInHours'] ?? null;
        $this->locale = $values['locale'] ?? null;
        $this->platform = $values['platform'];
        $this->returnUrl = $values['returnUrl'] ?? null;
    }
}
