# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PartnerDetailField
      extend Peal::Internal::Types::Enum

      NAME = "name"
      LOGO_URL = "logoUrl"
      ACCENT_COLOR = "accentColor"
      RETURN_ORIGINS = "returnOrigins"
      EXTERNAL_ID = "externalId"
      PERMISSIONS = "permissions"
    end
  end
end
