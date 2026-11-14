# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module SiteNotConnectedReason
      extend Peal::Internal::Types::Enum

      NOT_WORD_PRESS = "notWordPress"
      ADDRESS_NOT_ALLOWED = "addressNotAllowed"
      CREDENTIALS_REFUSED = "credentialsRefused"
      CANNOT_PUBLISH = "cannotPublish"
    end
  end
end
