# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConnectLink < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: true, api_name: "channelId"

      field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

      field :connected_platforms, -> { Internal::Types::Array[Peal::Types::Platform] }, optional: false, nullable: false, api_name: "connectedPlatforms"

      field :completed_at, -> { String }, optional: false, nullable: true, api_name: "completedAt"

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :expires_at, -> { String }, optional: false, nullable: false, api_name: "expiresAt"

      field :failed_at, -> { String }, optional: false, nullable: true, api_name: "failedAt"

      field :failure, -> { Peal::Types::HostedConnectFailure }, optional: false, nullable: true

      field :id, -> { String }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :platforms, -> { Internal::Types::Array[Peal::Types::Platform] }, optional: false, nullable: false

      field :return_url, -> { String }, optional: false, nullable: true, api_name: "returnUrl"

      field :status, -> { Peal::Types::ConnectLinkStatus }, optional: false, nullable: false
    end
  end
end
