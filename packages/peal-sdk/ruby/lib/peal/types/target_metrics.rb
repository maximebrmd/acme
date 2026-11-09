# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TargetMetrics < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :collecting, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :last_collected_at, -> { String }, optional: false, nullable: true, api_name: "lastCollectedAt"

      field :latest, -> { Peal::Types::PostMetrics }, optional: false, nullable: true

      field :permalink, -> { String }, optional: false, nullable: true

      field :published_at, -> { String }, optional: false, nullable: false, api_name: "publishedAt"

      field :snapshots, -> { Internal::Types::Array[Peal::Types::MetricsSnapshot] }, optional: false, nullable: false

      field :target_id, -> { String }, optional: false, nullable: false, api_name: "targetId"
    end
  end
end
