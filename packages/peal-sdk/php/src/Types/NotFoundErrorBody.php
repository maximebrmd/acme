<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class NotFoundErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'WebhookEndpointNotFound'
     *   |'WebhookDeliveryNotFound'
     *   |'WorkspaceNotFound'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    WebhookEndpointNotFoundEncoded
     *   |WebhookDeliveryNotFoundEncoded
     *   |WorkspaceNotFoundEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'WebhookEndpointNotFound'
     *   |'WebhookDeliveryNotFound'
     *   |'WorkspaceNotFound'
     *   |'_unknown'
     * ),
     *   value: (
     *    WebhookEndpointNotFoundEncoded
     *   |WebhookDeliveryNotFoundEncoded
     *   |WorkspaceNotFoundEncoded
     *   |mixed
     * ),
     * } $values
     */
    private function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->value = $values['value'];
    }

    /**
     * @param WebhookEndpointNotFoundEncoded $webhookEndpointNotFound
     * @return NotFoundErrorBody
     */
    public static function webhookEndpointNotFound(WebhookEndpointNotFoundEncoded $webhookEndpointNotFound): NotFoundErrorBody
    {
        return new NotFoundErrorBody([
            'type' => 'WebhookEndpointNotFound',
            'value' => $webhookEndpointNotFound,
        ]);
    }

    /**
     * @param WebhookDeliveryNotFoundEncoded $webhookDeliveryNotFound
     * @return NotFoundErrorBody
     */
    public static function webhookDeliveryNotFound(WebhookDeliveryNotFoundEncoded $webhookDeliveryNotFound): NotFoundErrorBody
    {
        return new NotFoundErrorBody([
            'type' => 'WebhookDeliveryNotFound',
            'value' => $webhookDeliveryNotFound,
        ]);
    }

    /**
     * @param WorkspaceNotFoundEncoded $workspaceNotFound
     * @return NotFoundErrorBody
     */
    public static function workspaceNotFound(WorkspaceNotFoundEncoded $workspaceNotFound): NotFoundErrorBody
    {
        return new NotFoundErrorBody([
            'type' => 'WorkspaceNotFound',
            'value' => $workspaceNotFound,
        ]);
    }

    /**
     * @return bool
     */
    public function isWebhookEndpointNotFound(): bool
    {
        return $this->value instanceof WebhookEndpointNotFoundEncoded && $this->type === 'WebhookEndpointNotFound';
    }

    /**
     * @return WebhookEndpointNotFoundEncoded
     */
    public function asWebhookEndpointNotFound(): WebhookEndpointNotFoundEncoded
    {
        if (!($this->value instanceof WebhookEndpointNotFoundEncoded && $this->type === 'WebhookEndpointNotFound')) {
            throw new Exception(
                "Expected WebhookEndpointNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isWebhookDeliveryNotFound(): bool
    {
        return $this->value instanceof WebhookDeliveryNotFoundEncoded && $this->type === 'WebhookDeliveryNotFound';
    }

    /**
     * @return WebhookDeliveryNotFoundEncoded
     */
    public function asWebhookDeliveryNotFound(): WebhookDeliveryNotFoundEncoded
    {
        if (!($this->value instanceof WebhookDeliveryNotFoundEncoded && $this->type === 'WebhookDeliveryNotFound')) {
            throw new Exception(
                "Expected WebhookDeliveryNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isWorkspaceNotFound(): bool
    {
        return $this->value instanceof WorkspaceNotFoundEncoded && $this->type === 'WorkspaceNotFound';
    }

    /**
     * @return WorkspaceNotFoundEncoded
     */
    public function asWorkspaceNotFound(): WorkspaceNotFoundEncoded
    {
        if (!($this->value instanceof WorkspaceNotFoundEncoded && $this->type === 'WorkspaceNotFound')) {
            throw new Exception(
                "Expected WorkspaceNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }

    /**
     * @return array<mixed>
     */
    public function jsonSerialize(): array
    {
        $result = [];
        $result['_tag'] = $this->type;

        $base = parent::jsonSerialize();
        $result = array_merge($base, $result);

        switch ($this->type) {
            case 'WebhookEndpointNotFound':
                $value = $this->asWebhookEndpointNotFound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'WebhookDeliveryNotFound':
                $value = $this->asWebhookDeliveryNotFound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'WorkspaceNotFound':
                $value = $this->asWorkspaceNotFound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case '_unknown':
            default:
                if (is_null($this->value)) {
                    break;
                }
                if ($this->value instanceof JsonSerializableType) {
                    $value = $this->value->jsonSerialize();
                    $result = array_merge($value, $result);
                } elseif (is_array($this->value)) {
                    $result = array_merge($this->value, $result);
                }
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function jsonDeserialize(array $data): static
    {
        $args = [];
        if (!array_key_exists('_tag', $data)) {
            throw new Exception(
                "JSON data is missing property '_tag'",
            );
        }
        $type = $data['_tag'];
        if (!(is_string($type))) {
            throw new Exception(
                "Expected property 'type' in JSON data to be string, instead received " . get_debug_type($data['_tag']),
            );
        }

        $args['type'] = $type;
        switch ($type) {
            case 'WebhookEndpointNotFound':
                $args['value'] = WebhookEndpointNotFoundEncoded::jsonDeserialize($data);
                break;
            case 'WebhookDeliveryNotFound':
                $args['value'] = WebhookDeliveryNotFoundEncoded::jsonDeserialize($data);
                break;
            case 'WorkspaceNotFound':
                $args['value'] = WorkspaceNotFoundEncoded::jsonDeserialize($data);
                break;
            case '_unknown':
            default:
                $args['type'] = '_unknown';
                $args['value'] = $data;
        }

        // @phpstan-ignore-next-line
        return new static($args);
    }
}
