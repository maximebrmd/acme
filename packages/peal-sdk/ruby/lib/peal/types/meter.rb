# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module Meter
      extend Peal::Internal::Types::Enum

      ASSISTANT_REQUESTS = "assistantRequests"
      ASSISTANT_IMAGES = "assistantImages"
      OUTBOUND_MESSAGES = "outboundMessages"
      MANAGED_ADS = "managedAds"
      X_API = "xApi"
    end
  end
end
