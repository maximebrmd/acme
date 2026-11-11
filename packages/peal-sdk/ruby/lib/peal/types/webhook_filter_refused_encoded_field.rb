# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module WebhookFilterRefusedEncodedField
      extend Peal::Internal::Types::Enum

      CHANNEL_IDS = "channelIds"
      WORKSPACE_IDS = "workspaceIds"
    end
  end
end
