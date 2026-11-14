<?php

namespace Peal\Channels\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\SitePlatform;

class ConnectSite extends JsonSerializableType
{
    /**
     * @var string $address
     */
    #[JsonProperty('address')]
    public string $address;

    /**
     * @var string $applicationPassword
     */
    #[JsonProperty('applicationPassword')]
    public string $applicationPassword;

    /**
     * @var value-of<SitePlatform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @var string $userName
     */
    #[JsonProperty('userName')]
    public string $userName;

    /**
     * @param array{
     *   address: string,
     *   applicationPassword: string,
     *   platform: value-of<SitePlatform>,
     *   userName: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->address = $values['address'];
        $this->applicationPassword = $values['applicationPassword'];
        $this->platform = $values['platform'];
        $this->userName = $values['userName'];
    }
}
