# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module TranslationLanguage
      extend Peal::Internal::Types::Enum

      EN = "en"
      FR = "fr"
      DE = "de"
      ES = "es"
      IT = "it"
      PT = "pt"
      NL = "nl"
      PL = "pl"
      JA = "ja"
      ZH_HANS = "zh-Hans"
    end
  end
end
