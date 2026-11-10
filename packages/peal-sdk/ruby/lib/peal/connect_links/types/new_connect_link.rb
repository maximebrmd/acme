# frozen_string_literal: true

module Peal
  module ConnectLinks
    module Types
      class NewConnectLink < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: true, nullable: false, api_name: "channelId"

        field :connection, -> { Peal::Types::ChannelConnection }, optional: true, nullable: false

        field :expires_in_hours, -> { Integer }, optional: true, nullable: false, api_name: "expiresInHours"

        field :locale, -> { Peal::Types::ConnectLinkLocale }, optional: true, nullable: false

        field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

        field :return_url, -> { String }, optional: true, nullable: false, api_name: "returnUrl"
      end
    end
  end
end
